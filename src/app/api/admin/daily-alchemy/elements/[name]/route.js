import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { kv } from '@vercel/kv';
import { normalizeKey } from '@/lib/daily-alchemy.constants';

// Check if KV is available
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

// Starter element emojis
const STARTER_EMOJIS = {
  earth: '🌍',
  water: '💧',
  fire: '🔥',
  wind: '💨',
};

/**
 * GET /api/admin/daily-alchemy/elements/[name]
 * Get detailed info about an element including all combinations that produce it
 */
export async function GET(request, { params }) {
  try {
    const elementName = decodeURIComponent(params.name).trim();

    if (!elementName) {
      return NextResponse.json({ error: 'Missing element name' }, { status: 400 });
    }

    logger.info('[ElementDetail] Fetching element details', { elementName });

    const supabase = createServerClient();

    // Check if this is a starter element
    const isStarter = ['earth', 'water', 'fire', 'wind'].includes(elementName.toLowerCase());

    // Get all combinations that produce this element
    const { data: asResult, error: resultError } = await supabase
      .from('element_combinations')
      .select(
        'id, combination_key, element_a, element_b, result_element, result_emoji, use_count, created_at'
      )
      .ilike('result_element', elementName)
      .not('element_a', 'eq', '_ADMIN')
      .order('use_count', { ascending: false });

    if (resultError) {
      logger.error('[ElementDetail] Error fetching result combinations', {
        error: resultError.message,
      });
      return NextResponse.json(
        { error: 'Database error', message: resultError.message },
        { status: 500 }
      );
    }

    // Get all combinations where this element is used as an input
    const { data: asInputA, error: inputAError } = await supabase
      .from('element_combinations')
      .select('id, combination_key, element_a, element_b, result_element, result_emoji, use_count')
      .ilike('element_a', elementName)
      .not('element_a', 'eq', '_ADMIN')
      .order('use_count', { ascending: false })
      .limit(50);

    const { data: asInputB, error: inputBError } = await supabase
      .from('element_combinations')
      .select('id, combination_key, element_a, element_b, result_element, result_emoji, use_count')
      .ilike('element_b', elementName)
      .not('element_a', 'eq', '_ADMIN')
      .order('use_count', { ascending: false })
      .limit(50);

    if (inputAError || inputBError) {
      logger.error('[ElementDetail] Error fetching input combinations', {
        errorA: inputAError?.message,
        errorB: inputBError?.message,
      });
    }

    // Combine and deduplicate input combinations
    const inputCombosMap = new Map();
    for (const combo of [...(asInputA || []), ...(asInputB || [])]) {
      if (!inputCombosMap.has(combo.combination_key)) {
        inputCombosMap.set(combo.combination_key, combo);
      }
    }
    const asInput = Array.from(inputCombosMap.values());

    // Get the canonical emoji for this element
    let emoji = STARTER_EMOJIS[elementName.toLowerCase()];
    if (!emoji && asResult && asResult.length > 0) {
      emoji = asResult[0].result_emoji || '✨';
    }

    // Deduplicate combinations that produce this element (same inputs might appear multiple times)
    const uniqueCombinations = [];
    const seenKeys = new Set();
    for (const combo of asResult || []) {
      const key = combo.combination_key;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueCombinations.push({
          id: combo.id,
          combinationKey: combo.combination_key,
          elementA: combo.element_a,
          elementB: combo.element_b,
          useCount: combo.use_count || 0,
          createdAt: combo.created_at,
        });
      }
    }

    return NextResponse.json({
      element: {
        name: asResult?.[0]?.result_element || elementName,
        emoji: emoji || '✨',
        isStarter,
      },
      combinations: uniqueCombinations,
      usedIn: asInput.map((c) => ({
        elementA: c.element_a,
        elementB: c.element_b,
        result: c.result_element,
        resultEmoji: c.result_emoji,
        useCount: c.use_count || 0,
      })),
      stats: {
        waysToCreate: uniqueCombinations.length,
        usedInCombinations: asInput.length,
        totalUses: uniqueCombinations.reduce((sum, c) => sum + c.useCount, 0),
      },
    });
  } catch (error) {
    logger.error('[ElementDetail] Unexpected error', {
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
 * PUT /api/admin/daily-alchemy/elements/[name]
 * Update an element's name and/or emoji across all combinations
 */
export async function PUT(request, { params }) {
  try {
    const elementName = decodeURIComponent(params.name).trim();
    const body = await request.json();
    const { newName, newEmoji } = body;

    if (!elementName) {
      return NextResponse.json({ error: 'Missing element name' }, { status: 400 });
    }

    if (!newName && !newEmoji) {
      return NextResponse.json(
        { error: 'Must provide at least one of: newName, newEmoji' },
        { status: 400 }
      );
    }

    // Check if it's a starter element and prevent name changes
    const starterElements = ['earth', 'water', 'fire', 'wind'];
    if (starterElements.includes(elementName.toLowerCase()) && newName) {
      return NextResponse.json({ error: 'Cannot rename starter elements' }, { status: 400 });
    }

    logger.info('[ElementDetail] Updating element', { elementName, newName, newEmoji });

    const supabase = createServerClient();
    const results = {
      elementAUpdated: 0,
      elementBUpdated: 0,
      resultUpdated: 0,
      cacheCleared: 0,
    };

    // Get all combinations that will be affected (for cache invalidation)
    const { data: affectedCombos } = await supabase
      .from('element_combinations')
      .select('combination_key')
      .or(
        `element_a.ilike.${elementName},element_b.ilike.${elementName},result_element.ilike.${elementName}`
      );

    // Update element_a where it matches
    if (newName) {
      const { count: countA } = await supabase
        .from('element_combinations')
        .update({ element_a: newName.trim() })
        .ilike('element_a', elementName)
        .select('id', { count: 'exact', head: true });

      results.elementAUpdated = countA || 0;

      // Update element_b where it matches
      const { count: countB } = await supabase
        .from('element_combinations')
        .update({ element_b: newName.trim() })
        .ilike('element_b', elementName)
        .select('id', { count: 'exact', head: true });

      results.elementBUpdated = countB || 0;
    }

    // Build result updates
    const resultUpdates = {};
    if (newName) {
      resultUpdates.result_element = newName.trim();
    }
    if (newEmoji) {
      resultUpdates.result_emoji = newEmoji.trim();
    }

    // Update result_element and/or result_emoji where it matches
    if (Object.keys(resultUpdates).length > 0) {
      const { count: countResult } = await supabase
        .from('element_combinations')
        .update(resultUpdates)
        .ilike('result_element', elementName)
        .select('id', { count: 'exact', head: true });

      results.resultUpdated = countResult || 0;
    }

    // Update combination_keys if element name changed
    if (newName) {
      const { data: toUpdate } = await supabase
        .from('element_combinations')
        .select('id, element_a, element_b')
        .or(`element_a.ilike.${newName.trim()},element_b.ilike.${newName.trim()}`);

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

    // Clear Redis cache for affected combinations
    if (isKvAvailable && affectedCombos && affectedCombos.length > 0) {
      try {
        const cacheKeys = affectedCombos.map((c) => `soup:combo:${c.combination_key}`);
        await Promise.all(cacheKeys.map((key) => kv.del(key)));
        results.cacheCleared = cacheKeys.length;
        logger.info('[ElementDetail] Cleared cache for updated combinations', {
          count: cacheKeys.length,
        });
      } catch (cacheError) {
        logger.error('[ElementDetail] Cache clear error', { error: cacheError.message });
      }
    }

    const totalUpdated = results.elementAUpdated + results.elementBUpdated + results.resultUpdated;

    logger.info('[ElementDetail] Element updated', {
      elementName,
      newName,
      newEmoji,
      ...results,
      totalUpdated,
    });

    return NextResponse.json({
      success: true,
      elementName,
      newName: newName?.trim(),
      newEmoji: newEmoji?.trim(),
      ...results,
      totalUpdated,
    });
  } catch (error) {
    logger.error('[ElementDetail] Unexpected error during update', {
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
 * DELETE /api/admin/daily-alchemy/elements/[name]
 * Delete an element and all combinations where it appears
 */
export async function DELETE(request, { params }) {
  try {
    const elementName = decodeURIComponent(params.name).trim();

    if (!elementName) {
      return NextResponse.json({ error: 'Missing element name' }, { status: 400 });
    }

    // Check if it's a starter element
    const starterElements = ['earth', 'water', 'fire', 'wind'];
    if (starterElements.includes(elementName.toLowerCase())) {
      return NextResponse.json({ error: 'Cannot delete starter elements' }, { status: 400 });
    }

    logger.info('[ElementDetail] Deleting element', { elementName });

    const supabase = createServerClient();

    // Find all combinations involving this element
    const { data: combinations, error: findError } = await supabase
      .from('element_combinations')
      .select('id, combination_key, element_a, element_b, result_element')
      .or(
        `element_a.ilike.${elementName},element_b.ilike.${elementName},result_element.ilike.${elementName}`
      );

    if (findError) {
      logger.error('[ElementDetail] Error finding combinations', { error: findError.message });
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
      logger.error('[ElementDetail] Error deleting combinations', { error: deleteError.message });
      return NextResponse.json(
        { error: 'Failed to delete combinations', message: deleteError.message },
        { status: 500 }
      );
    }

    // Clear Redis cache for deleted combinations
    if (isKvAvailable && cacheKeysToDelete.length > 0) {
      try {
        await Promise.all(cacheKeysToDelete.map((key) => kv.del(key)));
        logger.info('[ElementDetail] Cleared cache for deleted combinations', {
          count: cacheKeysToDelete.length,
        });
      } catch (cacheError) {
        logger.error('[ElementDetail] Cache clear error', { error: cacheError.message });
      }
    }

    logger.info('[ElementDetail] Element deleted', {
      elementName,
      combinationsDeleted: combinations.length,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        elementName,
        combinationsDeleted: combinations.length,
      },
    });
  } catch (error) {
    logger.error('[ElementDetail] Unexpected error during deletion', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
