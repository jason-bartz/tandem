import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { kv } from '@vercel/kv';

// Check if KV is available
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

/**
 * GET /api/admin/daily-alchemy/elements/browse
 * Get a paginated list of unique elements with letter filtering
 * Query params:
 * - letter: filter by first letter (A-Z, or 'all' for all)
 * - page: page number (default 1)
 * - limit: items per page (default 100, max 200)
 * - search: search query (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const letter = searchParams.get('letter')?.toUpperCase() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
    const search = searchParams.get('search')?.trim() || '';

    logger.info('[ElementBrowse] Fetching elements', { letter, page, limit, search });

    const supabase = createServerClient();

    // Get all unique elements from result_element column
    // We need to aggregate to get unique elements with their emojis
    let query = supabase
      .from('element_combinations')
      .select('result_element, result_emoji')
      .not('element_a', 'eq', '_ADMIN'); // Exclude admin placeholders

    // Apply letter filter
    if (letter !== 'all' && /^[A-Z]$/.test(letter)) {
      query = query.ilike('result_element', `${letter}%`);
    }

    // Apply search filter
    if (search) {
      query = query.ilike('result_element', `%${search}%`);
    }

    // Order by result_element for consistent pagination
    query = query.order('result_element', { ascending: true });

    const { data: rawData, error } = await query;

    if (error) {
      logger.error('[ElementBrowse] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Deduplicate by element name (case-insensitive) and collect emojis
    const elementMap = new Map();
    for (const row of rawData || []) {
      const key = row.result_element.toLowerCase();
      if (!elementMap.has(key)) {
        elementMap.set(key, {
          name: row.result_element,
          emoji: row.result_emoji || '✨',
        });
      }
    }

    // Also include starter elements if they match the filter
    const starterElements = [
      { name: 'Earth', emoji: '🌍' },
      { name: 'Water', emoji: '💧' },
      { name: 'Fire', emoji: '🔥' },
      { name: 'Wind', emoji: '💨' },
    ];

    for (const starter of starterElements) {
      const key = starter.name.toLowerCase();
      const startsWithLetter = letter === 'all' || starter.name.toUpperCase().startsWith(letter);
      const matchesSearch = !search || starter.name.toLowerCase().includes(search.toLowerCase());

      if (startsWithLetter && matchesSearch && !elementMap.has(key)) {
        elementMap.set(key, starter);
      }
    }

    // Convert to array and sort alphabetically
    const allElements = Array.from(elementMap.values()).sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    // Calculate pagination
    const total = allElements.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const elements = allElements.slice(offset, offset + limit);

    // Get letter counts for the filter UI
    const letterCounts = {};
    for (const el of Array.from(elementMap.values())) {
      const firstLetter = el.name.charAt(0).toUpperCase();
      if (/^[A-Z]$/.test(firstLetter)) {
        letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
      }
    }

    return NextResponse.json({
      elements,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      letterCounts: letter === 'all' ? letterCounts : undefined,
    });
  } catch (error) {
    logger.error('[ElementBrowse] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/daily-alchemy/elements/browse
 * Delete an element and all combinations where it appears
 * Query params:
 * - name: element name to delete (required)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const elementName = searchParams.get('name')?.trim();

    if (!elementName) {
      return NextResponse.json({ error: 'Missing required parameter: name' }, { status: 400 });
    }

    // Check if it's a starter element
    const starterElements = ['earth', 'water', 'fire', 'wind'];
    if (starterElements.includes(elementName.toLowerCase())) {
      return NextResponse.json({ error: 'Cannot delete starter elements' }, { status: 400 });
    }

    logger.info('[ElementBrowse] Deleting element', { elementName });

    const supabase = createServerClient();

    // Find all combinations involving this element
    const { data: combinations, error: findError } = await supabase
      .from('element_combinations')
      .select('id, combination_key, element_a, element_b, result_element')
      .or(
        `element_a.ilike.${elementName},element_b.ilike.${elementName},result_element.ilike.${elementName}`
      );

    if (findError) {
      logger.error('[ElementBrowse] Error finding combinations', { error: findError.message });
      return NextResponse.json(
        { error: 'Database error', message: findError.message },
        { status: 500 }
      );
    }

    if (!combinations || combinations.length === 0) {
      return NextResponse.json({ error: 'Element not found in any combinations' }, { status: 404 });
    }

    // Collect cache keys to invalidate
    const cacheKeysToDelete = combinations.map((c) => `soup:combo:${c.combination_key}`);

    // Delete all combinations
    const { error: deleteError } = await supabase
      .from('element_combinations')
      .delete()
      .or(
        `element_a.ilike.${elementName},element_b.ilike.${elementName},result_element.ilike.${elementName}`
      );

    if (deleteError) {
      logger.error('[ElementBrowse] Error deleting combinations', { error: deleteError.message });
      return NextResponse.json(
        { error: 'Failed to delete combinations', message: deleteError.message },
        { status: 500 }
      );
    }

    // Clear Redis cache for deleted combinations
    if (isKvAvailable && cacheKeysToDelete.length > 0) {
      try {
        await Promise.all(cacheKeysToDelete.map((key) => kv.del(key)));
        logger.info('[ElementBrowse] Cleared cache for deleted combinations', {
          count: cacheKeysToDelete.length,
        });
      } catch (cacheError) {
        logger.error('[ElementBrowse] Cache clear error', { error: cacheError.message });
        // Continue - cache will expire naturally
      }
    }

    logger.info('[ElementBrowse] Element deleted', {
      elementName,
      combinationsDeleted: combinations.length,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        elementName,
        combinationsDeleted: combinations.length,
        combinations: combinations.map((c) => ({
          elementA: c.element_a,
          elementB: c.element_b,
          result: c.result_element,
        })),
      },
    });
  } catch (error) {
    logger.error('[ElementBrowse] Unexpected error during deletion', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
