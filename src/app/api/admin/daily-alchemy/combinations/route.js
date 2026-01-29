import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { normalizeKey } from '@/lib/daily-alchemy.constants';
import { kv } from '@vercel/kv';

// Check if KV is available
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

/**
 * DELETE /api/admin/daily-alchemy/combinations
 * Delete a specific combination from the database
 * Query params:
 * - elementA: first element name (required)
 * - elementB: second element name (required)
 * OR
 * - key: the combination_key directly (required)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let combinationKey = searchParams.get('key');
    const elementA = searchParams.get('elementA')?.trim();
    const elementB = searchParams.get('elementB')?.trim();

    // Generate key from elements if not provided directly
    if (!combinationKey && elementA && elementB) {
      combinationKey = normalizeKey(elementA, elementB);
    }

    if (!combinationKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: either key or (elementA and elementB)' },
        { status: 400 }
      );
    }

    logger.info('[CombinationsAPI] Deleting combination', { combinationKey });

    const supabase = createServerClient();

    // First, check if the combination exists
    const { data: existing, error: fetchError } = await supabase
      .from('element_combinations')
      .select('id, element_a, element_b, result_element, result_emoji')
      .eq('combination_key', combinationKey)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('[CombinationsAPI] Error fetching combination', {
        combinationKey,
        error: fetchError.message,
      });
      return NextResponse.json(
        { error: 'Database error', message: fetchError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: 'Combination not found' }, { status: 404 });
    }

    // Delete the combination
    const { error: deleteError } = await supabase
      .from('element_combinations')
      .delete()
      .eq('combination_key', combinationKey);

    if (deleteError) {
      logger.error('[CombinationsAPI] Error deleting combination', {
        combinationKey,
        error: deleteError.message,
      });
      return NextResponse.json(
        { error: 'Failed to delete combination', message: deleteError.message },
        { status: 500 }
      );
    }

    logger.info('[CombinationsAPI] Combination deleted', {
      combinationKey,
      elementA: existing.element_a,
      elementB: existing.element_b,
      result: existing.result_element,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        combinationKey,
        elementA: existing.element_a,
        elementB: existing.element_b,
        result: existing.result_element,
        emoji: existing.result_emoji,
      },
    });
  } catch (error) {
    logger.error('[CombinationsAPI] Unexpected error during deletion', {
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
 * PUT /api/admin/daily-alchemy/combinations
 * Update an existing combination's result element, emoji, or both
 * Body:
 * - elementA: first element name (required)
 * - elementB: second element name (required)
 * - newResult: new result element name (optional)
 * - newEmoji: new result emoji (optional)
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { elementA, elementB, newResult, newEmoji } = body;

    if (!elementA || !elementB) {
      return NextResponse.json(
        { error: 'Missing required fields: elementA, elementB' },
        { status: 400 }
      );
    }

    if (!newResult && !newEmoji) {
      return NextResponse.json(
        { error: 'Must provide at least one of: newResult, newEmoji' },
        { status: 400 }
      );
    }

    const combinationKey = normalizeKey(elementA.trim(), elementB.trim());

    logger.info('[CombinationsAPI] Updating combination', {
      combinationKey,
      newResult,
      newEmoji,
    });

    const supabase = createServerClient();

    // Check if the combination exists
    const { data: existing, error: fetchError } = await supabase
      .from('element_combinations')
      .select('id, element_a, element_b, result_element, result_emoji')
      .eq('combination_key', combinationKey)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('[CombinationsAPI] Error fetching combination', {
        combinationKey,
        error: fetchError.message,
      });
      return NextResponse.json(
        { error: 'Database error', message: fetchError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: 'Combination not found' }, { status: 404 });
    }

    // Build update object
    const updates = {};
    if (newResult) {
      updates.result_element = newResult.trim();
    }
    if (newEmoji) {
      updates.result_emoji = newEmoji.trim();
    }

    // Update the combination
    const { error: updateError } = await supabase
      .from('element_combinations')
      .update(updates)
      .eq('combination_key', combinationKey);

    if (updateError) {
      logger.error('[CombinationsAPI] Error updating combination', {
        combinationKey,
        error: updateError.message,
      });
      return NextResponse.json(
        { error: 'Failed to update combination', message: updateError.message },
        { status: 500 }
      );
    }

    logger.info('[CombinationsAPI] Combination updated', {
      combinationKey,
      oldResult: existing.result_element,
      oldEmoji: existing.result_emoji,
      newResult: newResult || existing.result_element,
      newEmoji: newEmoji || existing.result_emoji,
    });

    return NextResponse.json({
      success: true,
      updated: {
        combinationKey,
        elementA: existing.element_a,
        elementB: existing.element_b,
        oldResult: existing.result_element,
        oldEmoji: existing.result_emoji,
        newResult: newResult || existing.result_element,
        newEmoji: newEmoji || existing.result_emoji,
      },
    });
  } catch (error) {
    logger.error('[CombinationsAPI] Unexpected error during update', {
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
 * PATCH /api/admin/daily-alchemy/combinations
 * Update an element's name and/or emoji across all combinations where it appears
 * This is useful for correcting element names or emojis that are used in multiple places
 * Body:
 * - elementName: current element name (required)
 * - newName: new element name (optional)
 * - newEmoji: new emoji for this element (optional)
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { elementName, newName, newEmoji } = body;

    if (!elementName) {
      return NextResponse.json({ error: 'Missing required field: elementName' }, { status: 400 });
    }

    if (!newName && !newEmoji) {
      return NextResponse.json(
        { error: 'Must provide at least one of: newName, newEmoji' },
        { status: 400 }
      );
    }

    const trimmedElement = elementName.trim();
    const trimmedNewName = newName?.trim();
    const trimmedNewEmoji = newEmoji?.trim();

    logger.info('[CombinationsAPI] Updating element across combinations', {
      elementName: trimmedElement,
      newName: trimmedNewName,
      newEmoji: trimmedNewEmoji,
    });

    const supabase = createServerClient();
    const results = {
      elementAUpdated: 0,
      elementBUpdated: 0,
      resultUpdated: 0,
      errors: [],
    };

    // Update element_a where it matches
    if (trimmedNewName) {
      const { error: errorA, count: countA } = await supabase
        .from('element_combinations')
        .update({ element_a: trimmedNewName })
        .ilike('element_a', trimmedElement)
        .select('id', { count: 'exact' });

      if (errorA) {
        results.errors.push(`element_a update: ${errorA.message}`);
      } else {
        results.elementAUpdated = countA || 0;
      }

      // Update element_b where it matches
      const { error: errorB, count: countB } = await supabase
        .from('element_combinations')
        .update({ element_b: trimmedNewName })
        .ilike('element_b', trimmedElement)
        .select('id', { count: 'exact' });

      if (errorB) {
        results.errors.push(`element_b update: ${errorB.message}`);
      } else {
        results.elementBUpdated = countB || 0;
      }
    }

    // Build result updates
    const resultUpdates = {};
    if (trimmedNewName) {
      resultUpdates.result_element = trimmedNewName;
    }
    if (trimmedNewEmoji) {
      resultUpdates.result_emoji = trimmedNewEmoji;
    }

    // Update result_element and/or result_emoji where it matches
    if (Object.keys(resultUpdates).length > 0) {
      const { error: errorResult, count: countResult } = await supabase
        .from('element_combinations')
        .update(resultUpdates)
        .ilike('result_element', trimmedElement)
        .select('id', { count: 'exact' });

      if (errorResult) {
        results.errors.push(`result update: ${errorResult.message}`);
      } else {
        results.resultUpdated = countResult || 0;
      }
    }

    // Also need to update combination_keys if element name changed
    // This is tricky because combination_key is computed, so we need to recalculate
    if (trimmedNewName) {
      // Fetch all combinations that need key updates
      const { data: toUpdate } = await supabase
        .from('element_combinations')
        .select('id, element_a, element_b')
        .or(`element_a.ilike.${trimmedNewName},element_b.ilike.${trimmedNewName}`);

      if (toUpdate && toUpdate.length > 0) {
        for (const combo of toUpdate) {
          const newKey = normalizeKey(combo.element_a, combo.element_b);
          await supabase
            .from('element_combinations')
            .update({ combination_key: newKey })
            .eq('id', combo.id);
        }
      }
    }

    const totalUpdated = results.elementAUpdated + results.elementBUpdated + results.resultUpdated;

    logger.info('[CombinationsAPI] Element updated across combinations', {
      elementName: trimmedElement,
      ...results,
      totalUpdated,
    });

    return NextResponse.json({
      success: true,
      elementName: trimmedElement,
      newName: trimmedNewName,
      newEmoji: trimmedNewEmoji,
      ...results,
      totalUpdated,
    });
  } catch (error) {
    logger.error('[CombinationsAPI] Unexpected error during element update', {
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
 * POST /api/admin/daily-alchemy/combinations
 * Create a new combination
 * Body:
 * - elementA: first element name (required)
 * - elementB: second element name (required)
 * - result: result element name (required)
 * - emoji: result emoji (optional, defaults to ✨)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { elementA, elementB, result, emoji } = body;

    if (!elementA || !elementB || !result) {
      return NextResponse.json(
        { error: 'Missing required fields: elementA, elementB, result' },
        { status: 400 }
      );
    }

    const trimmedA = elementA.trim();
    const trimmedB = elementB.trim();
    const trimmedResult = result.trim();
    const trimmedEmoji = emoji?.trim() || '✨';

    const combinationKey = normalizeKey(trimmedA, trimmedB);

    logger.info('[CombinationsAPI] Creating combination', {
      combinationKey,
      elementA: trimmedA,
      elementB: trimmedB,
      result: trimmedResult,
      emoji: trimmedEmoji,
    });

    const supabase = createServerClient();

    // Check if the combination already exists
    const { data: existing, error: fetchError } = await supabase
      .from('element_combinations')
      .select('id, element_a, element_b, result_element, result_emoji')
      .eq('combination_key', combinationKey)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('[CombinationsAPI] Error checking existing combination', {
        combinationKey,
        error: fetchError.message,
      });
      return NextResponse.json(
        { error: 'Database error', message: fetchError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: 'Combination already exists',
          existing: {
            elementA: existing.element_a,
            elementB: existing.element_b,
            result: existing.result_element,
            emoji: existing.result_emoji,
          },
        },
        { status: 409 }
      );
    }

    // Create the new combination
    const { data: inserted, error: insertError } = await supabase
      .from('element_combinations')
      .insert({
        combination_key: combinationKey,
        element_a: trimmedA,
        element_b: trimmedB,
        result_element: trimmedResult,
        result_emoji: trimmedEmoji,
        ai_generated: false,
        discovered_by: null,
      })
      .select('id, element_a, element_b, result_element, result_emoji')
      .single();

    if (insertError) {
      logger.error('[CombinationsAPI] Error creating combination', {
        combinationKey,
        error: insertError.message,
      });
      return NextResponse.json(
        { error: 'Failed to create combination', message: insertError.message },
        { status: 500 }
      );
    }

    // Clear Redis cache for this combination key if KV is available
    if (isKvAvailable) {
      try {
        await kv.del(`soup:combo:${combinationKey}`);
        logger.info('[CombinationsAPI] Cache cleared for new combination', { combinationKey });
      } catch (cacheError) {
        logger.error('[CombinationsAPI] Cache clear error', { error: cacheError.message });
        // Continue - cache will be updated on next request
      }
    }

    logger.info('[CombinationsAPI] Combination created', {
      combinationKey,
      elementA: inserted.element_a,
      elementB: inserted.element_b,
      result: inserted.result_element,
      emoji: inserted.result_emoji,
    });

    return NextResponse.json({
      success: true,
      combination: {
        id: inserted.id,
        combinationKey,
        elementA: inserted.element_a,
        elementB: inserted.element_b,
        result: inserted.result_element,
        emoji: inserted.result_emoji,
      },
    });
  } catch (error) {
    logger.error('[CombinationsAPI] Unexpected error during creation', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
