import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/daily-alchemy/elements
 * Search for existing elements in the database
 * Query params:
 * - q: search query (required, min 1 char)
 * - limit: max results (default 20)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    if (!query || query.length < 1) {
      return NextResponse.json({ elements: [] });
    }

    const supabase = createServerClient();

    // Search for elements that match the query in result_element
    // Also search element_a and element_b to catch all possible elements
    const { data, error } = await supabase
      .from('element_combinations')
      .select('result_element, result_emoji, element_a, element_b')
      .or(`result_element.ilike.%${query}%,element_a.ilike.%${query}%,element_b.ilike.%${query}%`)
      .limit(limit * 5); // Get more to dedupe since we're searching multiple columns

    if (error) {
      logger.error('[ElementSearch] Database error', { error: error.message, query });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Deduplicate by element name (case-insensitive)
    // Collect elements from result_element, element_a, and element_b columns
    const elementMap = new Map();

    for (const row of data || []) {
      // Check result_element
      if (row.result_element?.toLowerCase().includes(query.toLowerCase())) {
        const key = row.result_element.toLowerCase();
        if (!elementMap.has(key)) {
          elementMap.set(key, {
            name: row.result_element,
            emoji: row.result_emoji || '✨',
          });
        }
      }

      // Check element_a (might be a discoverable element)
      if (row.element_a?.toLowerCase().includes(query.toLowerCase())) {
        const key = row.element_a.toLowerCase();
        if (!elementMap.has(key)) {
          // Get emoji from a row where this is the result
          elementMap.set(key, {
            name: row.element_a,
            emoji: getStarterEmoji(row.element_a) || '✨',
          });
        }
      }

      // Check element_b
      if (row.element_b?.toLowerCase().includes(query.toLowerCase())) {
        const key = row.element_b.toLowerCase();
        if (!elementMap.has(key)) {
          elementMap.set(key, {
            name: row.element_b,
            emoji: getStarterEmoji(row.element_b) || '✨',
          });
        }
      }
    }

    // Also include starter elements if they match
    const starterElements = [
      { name: 'Earth', emoji: '🌍' },
      { name: 'Water', emoji: '💧' },
      { name: 'Fire', emoji: '🔥' },
      { name: 'Wind', emoji: '💨' },
    ];

    for (const starter of starterElements) {
      if (starter.name.toLowerCase().includes(query.toLowerCase())) {
        const key = starter.name.toLowerCase();
        if (!elementMap.has(key)) {
          elementMap.set(key, starter);
        }
      }
    }

    // Convert to array, sort by relevance (exact matches first), and limit
    const elements = Array.from(elementMap.values())
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === query.toLowerCase();
        const bExact = b.name.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;
        const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase());
        const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    return NextResponse.json({ elements });
  } catch (error) {
    logger.error('[ElementSearch] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Helper to get starter element emoji
function getStarterEmoji(name) {
  const emojiMap = {
    earth: '🌍',
    water: '💧',
    fire: '🔥',
    wind: '💨',
  };
  return emojiMap[name?.toLowerCase()];
}

/**
 * POST /api/admin/element-soup/elements
 * Add a new element to the database (admin-created, not discovered through gameplay)
 * Body:
 * - name: element name
 * - emoji: element emoji
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, emoji } = body;

    if (!name || !emoji) {
      return NextResponse.json({ error: 'Missing required fields: name, emoji' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if element already exists
    const { data: existing } = await supabase
      .from('element_combinations')
      .select('result_element, result_emoji')
      .ilike('result_element', name)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        element: {
          name: existing[0].result_element,
          emoji: existing[0].result_emoji,
        },
        alreadyExists: true,
      });
    }

    // Create a placeholder combination for this admin-defined element
    // This allows the element to exist in the database for puzzle targeting
    // without counting as a player discovery
    const combinationKey = `_admin_${name.toLowerCase().replace(/\s+/g, '_')}`;

    const { data: inserted, error } = await supabase
      .from('element_combinations')
      .insert({
        combination_key: combinationKey,
        element_a: '_ADMIN',
        element_b: '_DEFINED',
        result_element: name,
        result_emoji: emoji,
        ai_generated: false,
        discovered_by: null,
      })
      .select('result_element, result_emoji')
      .single();

    if (error) {
      // If unique constraint, element was just created by another request
      if (error.code === '23505') {
        const { data: existing2 } = await supabase
          .from('element_combinations')
          .select('result_element, result_emoji')
          .ilike('result_element', name)
          .limit(1);

        if (existing2 && existing2.length > 0) {
          return NextResponse.json({
            success: true,
            element: {
              name: existing2[0].result_element,
              emoji: existing2[0].result_emoji,
            },
            alreadyExists: true,
          });
        }
      }

      logger.error('[ElementCreate] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    logger.info('[ElementCreate] Admin created element', { name, emoji });

    return NextResponse.json({
      success: true,
      element: {
        name: inserted.result_element,
        emoji: inserted.result_emoji,
      },
      alreadyExists: false,
    });
  } catch (error) {
    logger.error('[ElementCreate] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
