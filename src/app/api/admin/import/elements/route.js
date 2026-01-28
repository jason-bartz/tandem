import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/import/elements
 * List imported elements with pagination and filtering
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 100, max: 500)
 * - letter: Filter by first letter (A-Z, or 'other' for non-alphabetic)
 * - search: Search by name (partial match)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const letter = searchParams.get('letter')?.toUpperCase();
    const search = searchParams.get('search')?.trim();

    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    // Build query
    let query = supabase.from('import_elements').select('*', { count: 'exact' });

    // Apply letter filter
    if (letter) {
      if (letter === 'OTHER') {
        // Non-alphabetic first characters
        query = query.not('name', 'like', '[A-Za-z]%');
      } else if (/^[A-Z]$/.test(letter)) {
        query = query.ilike('name', `${letter}%`);
      }
    }

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination and ordering
    query = query.order('name', { ascending: true }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      logger.error('[ImportElementsAPI] Error fetching elements', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      elements: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('[ImportElementsAPI] Unexpected error', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/import/elements
 * Update an element's name and/or emoji across all combinations
 *
 * Body:
 * - currentName: Current element name (required)
 * - newName: New element name (optional)
 * - newEmoji: New emoji (optional)
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { currentName, newName, newEmoji } = body;

    if (!currentName) {
      return NextResponse.json({ error: 'currentName is required' }, { status: 400 });
    }

    if (!newName && !newEmoji) {
      return NextResponse.json({ error: 'Must provide newName or newEmoji' }, { status: 400 });
    }

    const trimmedCurrent = currentName.trim();
    const trimmedNewName = newName?.trim();
    const trimmedNewEmoji = newEmoji?.trim();

    const supabase = createServerClient();

    // Check if element exists
    const { data: existing, error: fetchError } = await supabase
      .from('import_elements')
      .select('*')
      .ilike('name', trimmedCurrent)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    // If changing name, check for conflicts
    if (trimmedNewName && trimmedNewName.toLowerCase() !== trimmedCurrent.toLowerCase()) {
      const { data: conflict } = await supabase
        .from('import_elements')
        .select('id')
        .ilike('name', trimmedNewName)
        .single();

      if (conflict) {
        return NextResponse.json(
          { error: 'An element with that name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the element
    const elementUpdates = {};
    if (trimmedNewName) elementUpdates.name = trimmedNewName;
    if (trimmedNewEmoji) elementUpdates.emoji = trimmedNewEmoji;

    const { error: updateError } = await supabase
      .from('import_elements')
      .update(elementUpdates)
      .eq('id', existing.id);

    if (updateError) {
      logger.error('[ImportElementsAPI] Error updating element', { error: updateError.message });
      return NextResponse.json({ error: 'Failed to update element' }, { status: 500 });
    }

    // Update all combinations that reference this element
    const results = { elementAUpdated: 0, elementBUpdated: 0, resultUpdated: 0 };

    if (trimmedNewName) {
      // Update element_a
      const { count: countA } = await supabase
        .from('import_combinations')
        .update({ element_a: trimmedNewName })
        .ilike('element_a', trimmedCurrent)
        .select('*', { count: 'exact', head: true });
      results.elementAUpdated = countA || 0;

      // Update element_b
      const { count: countB } = await supabase
        .from('import_combinations')
        .update({ element_b: trimmedNewName })
        .ilike('element_b', trimmedCurrent)
        .select('*', { count: 'exact', head: true });
      results.elementBUpdated = countB || 0;

      // Update result_element
      const { count: countR } = await supabase
        .from('import_combinations')
        .update({ result_element: trimmedNewName })
        .ilike('result_element', trimmedCurrent)
        .select('*', { count: 'exact', head: true });
      results.resultUpdated = countR || 0;

      // Update combination_keys
      const { data: toUpdateKeys } = await supabase
        .from('import_combinations')
        .select('id, element_a, element_b')
        .or(`element_a.ilike.${trimmedNewName},element_b.ilike.${trimmedNewName}`);

      if (toUpdateKeys) {
        for (const combo of toUpdateKeys) {
          const newKey = normalizeKey(combo.element_a, combo.element_b);
          await supabase
            .from('import_combinations')
            .update({ combination_key: newKey })
            .eq('id', combo.id);
        }
      }
    }

    // Update result_emoji if provided
    if (trimmedNewEmoji) {
      await supabase
        .from('import_combinations')
        .update({ result_emoji: trimmedNewEmoji })
        .ilike('result_element', trimmedNewName || trimmedCurrent);
    }

    logger.info('[ImportElementsAPI] Element updated', {
      currentName: trimmedCurrent,
      newName: trimmedNewName,
      newEmoji: trimmedNewEmoji,
      ...results,
    });

    return NextResponse.json({
      success: true,
      element: {
        name: trimmedNewName || trimmedCurrent,
        emoji: trimmedNewEmoji || existing.emoji,
      },
      combinationsUpdated:
        results.elementAUpdated + results.elementBUpdated + results.resultUpdated,
    });
  } catch (error) {
    logger.error('[ImportElementsAPI] Unexpected error during update', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/import/elements
 * Delete an element and all combinations where it appears
 *
 * Query params:
 * - name: Element name to delete (required)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();

    if (!name) {
      return NextResponse.json({ error: 'name query param is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if element exists
    const { data: existing, error: fetchError } = await supabase
      .from('import_elements')
      .select('*')
      .ilike('name', name)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    // Delete all combinations where this element appears
    const deletedCombinations = { asElementA: 0, asElementB: 0, asResult: 0 };

    // Delete where element is element_a
    const { count: countA } = await supabase
      .from('import_combinations')
      .delete()
      .ilike('element_a', name)
      .select('*', { count: 'exact', head: true });
    deletedCombinations.asElementA = countA || 0;

    // Delete where element is element_b
    const { count: countB } = await supabase
      .from('import_combinations')
      .delete()
      .ilike('element_b', name)
      .select('*', { count: 'exact', head: true });
    deletedCombinations.asElementB = countB || 0;

    // Delete where element is result
    const { count: countR } = await supabase
      .from('import_combinations')
      .delete()
      .ilike('result_element', name)
      .select('*', { count: 'exact', head: true });
    deletedCombinations.asResult = countR || 0;

    // Delete the element itself
    const { error: deleteError } = await supabase
      .from('import_elements')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      logger.error('[ImportElementsAPI] Error deleting element', { error: deleteError.message });
      return NextResponse.json({ error: 'Failed to delete element' }, { status: 500 });
    }

    const totalDeleted =
      deletedCombinations.asElementA +
      deletedCombinations.asElementB +
      deletedCombinations.asResult;

    logger.info('[ImportElementsAPI] Element deleted', {
      name,
      combinationsDeleted: totalDeleted,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        element: existing,
        combinationsDeleted: totalDeleted,
        breakdown: deletedCombinations,
      },
    });
  } catch (error) {
    logger.error('[ImportElementsAPI] Unexpected error during delete', { error: error.message });
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
