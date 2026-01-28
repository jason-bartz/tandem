import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/import/combinations
 * List combinations with filtering
 *
 * Query params:
 * - element: Filter by element name (appears in element_a, element_b, or result)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 100, max: 500)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const element = searchParams.get('element')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    let query = supabase.from('import_combinations').select('*', { count: 'exact' });

    if (element) {
      query = query.or(
        `element_a.ilike.%${element}%,element_b.ilike.%${element}%,result_element.ilike.%${element}%`
      );
    }

    query = query
      .order('element_a', { ascending: true })
      .order('element_b', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      logger.error('[ImportCombinationsAPI] Error fetching combinations', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      combinations: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('[ImportCombinationsAPI] Unexpected error', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/import/combinations
 * Update a combination's result element and/or emoji
 *
 * Body:
 * - elementA: First element (required)
 * - elementB: Second element (required)
 * - newResult: New result element name (optional)
 * - newEmoji: New result emoji (optional)
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { elementA, elementB, newResult, newEmoji } = body;

    if (!elementA || !elementB) {
      return NextResponse.json({ error: 'elementA and elementB are required' }, { status: 400 });
    }

    if (!newResult && !newEmoji) {
      return NextResponse.json({ error: 'Must provide newResult or newEmoji' }, { status: 400 });
    }

    const combinationKey = normalizeKey(elementA.trim(), elementB.trim());

    const supabase = createServerClient();

    // Check if combination exists
    const { data: existing, error: fetchError } = await supabase
      .from('import_combinations')
      .select('*')
      .eq('combination_key', combinationKey)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Combination not found' }, { status: 404 });
    }

    // Build update object
    const updates = {};
    if (newResult?.trim()) updates.result_element = newResult.trim();
    if (newEmoji?.trim()) updates.result_emoji = newEmoji.trim();

    const { error: updateError } = await supabase
      .from('import_combinations')
      .update(updates)
      .eq('combination_key', combinationKey);

    if (updateError) {
      logger.error('[ImportCombinationsAPI] Error updating combination', {
        error: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to update combination' }, { status: 500 });
    }

    logger.info('[ImportCombinationsAPI] Combination updated', {
      combinationKey,
      newResult: newResult?.trim(),
      newEmoji: newEmoji?.trim(),
    });

    return NextResponse.json({
      success: true,
      combination: {
        ...existing,
        result_element: newResult?.trim() || existing.result_element,
        result_emoji: newEmoji?.trim() || existing.result_emoji,
      },
    });
  } catch (error) {
    logger.error('[ImportCombinationsAPI] Unexpected error during update', {
      error: error.message,
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/import/combinations
 * Delete a specific combination
 *
 * Query params:
 * - elementA: First element (required)
 * - elementB: Second element (required)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const elementA = searchParams.get('elementA')?.trim();
    const elementB = searchParams.get('elementB')?.trim();

    if (!elementA || !elementB) {
      return NextResponse.json(
        { error: 'elementA and elementB query params are required' },
        { status: 400 }
      );
    }

    const combinationKey = normalizeKey(elementA, elementB);

    const supabase = createServerClient();

    // Check if combination exists
    const { data: existing, error: fetchError } = await supabase
      .from('import_combinations')
      .select('*')
      .eq('combination_key', combinationKey)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Combination not found' }, { status: 404 });
    }

    // Delete the combination
    const { error: deleteError } = await supabase
      .from('import_combinations')
      .delete()
      .eq('combination_key', combinationKey);

    if (deleteError) {
      logger.error('[ImportCombinationsAPI] Error deleting combination', {
        error: deleteError.message,
      });
      return NextResponse.json({ error: 'Failed to delete combination' }, { status: 500 });
    }

    logger.info('[ImportCombinationsAPI] Combination deleted', {
      combinationKey,
      elementA: existing.element_a,
      elementB: existing.element_b,
      result: existing.result_element,
    });

    return NextResponse.json({
      success: true,
      deleted: existing,
    });
  } catch (error) {
    logger.error('[ImportCombinationsAPI] Unexpected error during delete', {
      error: error.message,
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/import/combinations
 * Create a new combination
 *
 * Body:
 * - elementA: First element (required)
 * - elementB: Second element (required)
 * - result: Result element name (required)
 * - emoji: Result emoji (optional, defaults to ✨)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { elementA, elementB, result, emoji } = body;

    if (!elementA || !elementB || !result) {
      return NextResponse.json(
        { error: 'elementA, elementB, and result are required' },
        { status: 400 }
      );
    }

    const trimmedA = elementA.trim();
    const trimmedB = elementB.trim();
    const trimmedResult = result.trim();
    const trimmedEmoji = emoji?.trim() || '✨';
    const combinationKey = normalizeKey(trimmedA, trimmedB);

    const supabase = createServerClient();

    // Check if combination already exists
    const { data: existing } = await supabase
      .from('import_combinations')
      .select('*')
      .eq('combination_key', combinationKey)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Combination already exists', existing }, { status: 409 });
    }

    // Create the combination
    const { data: created, error: insertError } = await supabase
      .from('import_combinations')
      .insert({
        combination_key: combinationKey,
        element_a: trimmedA,
        element_b: trimmedB,
        result_element: trimmedResult,
        result_emoji: trimmedEmoji,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[ImportCombinationsAPI] Error creating combination', {
        error: insertError.message,
      });
      return NextResponse.json({ error: 'Failed to create combination' }, { status: 500 });
    }

    logger.info('[ImportCombinationsAPI] Combination created', {
      combinationKey,
      elementA: trimmedA,
      elementB: trimmedB,
      result: trimmedResult,
    });

    return NextResponse.json({
      success: true,
      combination: created,
    });
  } catch (error) {
    logger.error('[ImportCombinationsAPI] Unexpected error during create', {
      error: error.message,
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Helper function
function normalizeKey(a, b) {
  const lower = [a.toLowerCase().trim(), b.toLowerCase().trim()].sort();
  return `${lower[0]}|${lower[1]}`;
}
