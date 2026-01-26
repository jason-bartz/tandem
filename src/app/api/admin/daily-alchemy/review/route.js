import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

const STARTER_NAMES = new Set(STARTER_ELEMENTS.map((el) => el.name.toLowerCase()));
const STARTER_EMOJI_MAP = Object.fromEntries(
  STARTER_ELEMENTS.map((el) => [el.name.toLowerCase(), el.emoji])
);

/**
 * GET /api/admin/element-soup/review
 * Find all combinations that create a specific element and trace pathways
 * Query params:
 * - element: element name to find combinations for (required)
 * - pathways: if 'true', also compute pathways back to starter elements
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const element = searchParams.get('element')?.trim();
    const includePathways = searchParams.get('pathways') === 'true';

    if (!element) {
      return NextResponse.json({ error: 'Missing required parameter: element' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find all combinations that produce this element
    const { data: combinations, error } = await supabase
      .from('element_combinations')
      .select('combination_key, element_a, element_b, result_element, result_emoji, use_count')
      .ilike('result_element', element)
      .order('use_count', { ascending: false });

    if (error) {
      logger.error('[ElementReview] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Filter out admin-defined placeholder entries
    const validCombinations = (combinations || []).filter(
      (c) => c.element_a !== '_ADMIN' && c.element_b !== '_DEFINED'
    );

    if (validCombinations.length === 0) {
      // Check if it's a starter element
      if (STARTER_NAMES.has(element.toLowerCase())) {
        return NextResponse.json({
          element,
          isStarter: true,
          emoji: STARTER_EMOJI_MAP[element.toLowerCase()],
          combinations: [],
          message: 'This is a starter element',
        });
      }

      return NextResponse.json({
        element,
        combinations: [],
        message: 'No combinations found for this element',
      });
    }

    // Get the emoji from the first result
    const elementEmoji = validCombinations[0].result_emoji;

    // Format the combinations
    const formattedCombinations = validCombinations.map((c) => ({
      elementA: c.element_a,
      elementB: c.element_b,
      useCount: c.use_count,
    }));

    // If pathways requested, compute full pathways for each combination
    let pathways = null;
    if (includePathways) {
      // Fetch all combinations to build a lookup map
      const { data: allCombos, error: allError } = await supabase
        .from('element_combinations')
        .select('combination_key, element_a, element_b, result_element, result_emoji')
        .neq('element_a', '_ADMIN')
        .limit(5000); // Safety limit

      if (allError) {
        logger.error('[ElementReview] Error fetching all combos', { error: allError.message });
      } else {
        // Build a reverse lookup: element -> combinations that create it
        const reverseMap = new Map();
        for (const combo of allCombos || []) {
          const resultKey = combo.result_element.toLowerCase();
          if (!reverseMap.has(resultKey)) {
            reverseMap.set(resultKey, []);
          }
          reverseMap.get(resultKey).push({
            elementA: combo.element_a,
            elementB: combo.element_b,
            resultEmoji: combo.result_emoji,
          });
        }

        // Build emoji lookup from results
        const emojiMap = new Map();
        for (const combo of allCombos || []) {
          emojiMap.set(combo.result_element.toLowerCase(), combo.result_emoji);
        }
        // Add starter emojis
        for (const starter of STARTER_ELEMENTS) {
          emojiMap.set(starter.name.toLowerCase(), starter.emoji);
        }

        // For each combination, trace pathway back to starters
        pathways = formattedCombinations.map((combo, idx) => {
          const pathway = tracePathway(
            combo.elementA,
            combo.elementB,
            element,
            elementEmoji,
            reverseMap,
            emojiMap
          );
          return {
            id: idx,
            combination: combo,
            steps: pathway,
          };
        });
      }
    }

    return NextResponse.json({
      element,
      emoji: elementEmoji,
      combinations: formattedCombinations,
      pathways,
    });
  } catch (error) {
    logger.error('[ElementReview] Unexpected error', {
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
 * Trace a pathway from two elements back to starter elements
 * Uses BFS to find paths for each non-starter element
 */
function tracePathway(elementA, elementB, result, resultEmoji, reverseMap, emojiMap) {
  const visited = new Set();
  const queue = [{ elementA, elementB, result, resultEmoji, depth: 0 }];

  // Process in BFS order, but we'll reverse at the end for display
  const allSteps = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const stepKey = `${current.elementA}|${current.elementB}`.toLowerCase();

    if (visited.has(stepKey)) continue;
    visited.add(stepKey);

    const emojiA = emojiMap.get(current.elementA.toLowerCase()) || '❓';
    const emojiB = emojiMap.get(current.elementB.toLowerCase()) || '❓';

    allSteps.push({
      elementA: current.elementA,
      emojiA,
      elementB: current.elementB,
      emojiB,
      result: current.result,
      resultEmoji: current.resultEmoji,
      depth: current.depth,
    });

    // If elementA is not a starter, we need to trace it
    if (!STARTER_NAMES.has(current.elementA.toLowerCase())) {
      const combosForA = reverseMap.get(current.elementA.toLowerCase()) || [];
      if (combosForA.length > 0) {
        // Take the first combination (most used, since they're ordered)
        const comboA = combosForA[0];
        queue.push({
          elementA: comboA.elementA,
          elementB: comboA.elementB,
          result: current.elementA,
          resultEmoji: emojiMap.get(current.elementA.toLowerCase()) || '❓',
          depth: current.depth + 1,
        });
      }
    }

    // If elementB is not a starter, we need to trace it
    if (!STARTER_NAMES.has(current.elementB.toLowerCase())) {
      const combosForB = reverseMap.get(current.elementB.toLowerCase()) || [];
      if (combosForB.length > 0) {
        // Take the first combination
        const comboB = combosForB[0];
        queue.push({
          elementA: comboB.elementA,
          elementB: comboB.elementB,
          result: current.elementB,
          resultEmoji: emojiMap.get(current.elementB.toLowerCase()) || '❓',
          depth: current.depth + 1,
        });
      }
    }

    // Safety: prevent infinite loops
    if (allSteps.length > 50) break;
  }

  // Sort by depth descending (show earlier steps first) and number them
  allSteps.sort((a, b) => b.depth - a.depth);
  return allSteps.map((step, idx) => ({
    step: idx + 1,
    ...step,
  }));
}
