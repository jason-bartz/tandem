import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

/**
 * GET /api/admin/daily-alchemy/shortest-path
 * Find the shortest combination path from starter elements to a target element
 * Uses BFS to find the optimal path
 * Query params:
 * - target: target element name (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target')?.trim();

    if (!target) {
      return NextResponse.json({ error: 'Missing required parameter: target' }, { status: 400 });
    }

    const targetLower = target.toLowerCase();

    // Check if target is a starter element
    const isStarter = STARTER_ELEMENTS.some((s) => s.name.toLowerCase() === targetLower);
    if (isStarter) {
      const starterElement = STARTER_ELEMENTS.find((s) => s.name.toLowerCase() === targetLower);
      return NextResponse.json({
        target,
        isStarter: true,
        path: [],
        message: `${starterElement.name} is a starter element`,
      });
    }

    logger.info('[ShortestPath] Finding path to', { target });

    const supabase = createServerClient();

    // Fetch all combinations from the database
    const { data: combinations, error } = await supabase
      .from('element_combinations')
      .select('element_a, element_b, result_element, result_emoji')
      .not('element_a', 'eq', '_ADMIN');

    if (error) {
      logger.error('[ShortestPath] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    if (!combinations || combinations.length === 0) {
      return NextResponse.json({ error: 'No combinations found in database' }, { status: 404 });
    }

    // Build a map of result -> combinations that create it
    // Key: lowercase result element name
    // Value: array of { element_a, element_b, result_element, result_emoji }
    const resultToCombinations = new Map();
    for (const combo of combinations) {
      const resultKey = combo.result_element.toLowerCase();
      if (!resultToCombinations.has(resultKey)) {
        resultToCombinations.set(resultKey, []);
      }
      resultToCombinations.get(resultKey).push(combo);
    }

    // Check if target element exists in database
    if (!resultToCombinations.has(targetLower)) {
      return NextResponse.json({
        target,
        found: false,
        message: `Element "${target}" not found as a result of any combination`,
      });
    }

    // BFS to find shortest path
    // We work backwards from the target to starter elements
    // State: set of elements we have access to
    // We need to find the minimum number of combinations to reach the target

    const starterNames = new Set(STARTER_ELEMENTS.map((s) => s.name.toLowerCase()));

    // Build forward map: what can we create from existing elements?
    // Key: normalized pair "a|b" (sorted alphabetically)
    // Value: { element_a, element_b, result_element, result_emoji }
    const pairToResult = new Map();
    for (const combo of combinations) {
      const pair = [combo.element_a.toLowerCase(), combo.element_b.toLowerCase()].sort().join('|');
      pairToResult.set(pair, combo);
    }

    // BFS: start with starter elements, expand by finding what we can create
    // Track: for each element, the path (sequence of combinations) to create it
    const elementPaths = new Map();

    // Initialize starter elements with empty paths
    for (const starter of STARTER_ELEMENTS) {
      elementPaths.set(starter.name.toLowerCase(), {
        path: [],
        emoji: starter.emoji,
        name: starter.name,
      });
    }

    // Queue contains sets of available elements (as arrays for JSON serialization)
    // We use a more efficient approach: track newly available elements each round
    const currentElements = new Set(starterNames);
    let changed = true;
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Try all pairs of current elements
      const elementsArray = Array.from(currentElements);

      for (let i = 0; i < elementsArray.length; i++) {
        for (let j = i; j < elementsArray.length; j++) {
          const a = elementsArray[i];
          const b = elementsArray[j];
          const pair = [a, b].sort().join('|');

          const combo = pairToResult.get(pair);
          if (!combo) continue;

          const resultKey = combo.result_element.toLowerCase();

          // If we haven't seen this result, or found a shorter path
          if (!elementPaths.has(resultKey)) {
            const pathA = elementPaths.get(a)?.path || [];
            const pathB = elementPaths.get(b)?.path || [];

            // Combine paths and add this combination step
            // We need to merge the paths properly
            const newPath = [...pathA];

            // Add steps from pathB that aren't already in newPath
            for (const step of pathB) {
              const stepKey =
                `${step.element_a}|${step.element_b}|${step.result_element}`.toLowerCase();
              const existsInPath = newPath.some(
                (s) => `${s.element_a}|${s.element_b}|${s.result_element}`.toLowerCase() === stepKey
              );
              if (!existsInPath) {
                newPath.push(step);
              }
            }

            // Add the current combination as the final step
            newPath.push({
              element_a: combo.element_a,
              element_b: combo.element_b,
              result_element: combo.result_element,
              result_emoji: combo.result_emoji,
            });

            elementPaths.set(resultKey, {
              path: newPath,
              emoji: combo.result_emoji,
              name: combo.result_element,
            });

            currentElements.add(resultKey);
            changed = true;

            // If we found the target, we can potentially stop early
            // But BFS guarantees shortest path, so we continue until no more changes
          }
        }
      }
    }

    // Check if we found a path to the target
    if (!elementPaths.has(targetLower)) {
      return NextResponse.json({
        target,
        found: false,
        message: `No path found from starter elements to "${target}"`,
      });
    }

    const result = elementPaths.get(targetLower);

    logger.info('[ShortestPath] Path found', {
      target,
      steps: result.path.length,
      iterations,
    });

    return NextResponse.json({
      target,
      found: true,
      steps: result.path.length,
      path: result.path,
    });
  } catch (error) {
    logger.error('[ShortestPath] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
