import logger from '@/lib/logger';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

const STARTER_NAMES = new Set(STARTER_ELEMENTS.map((s) => s.name.toLowerCase()));

/**
 * Detect whether a combination_key represents a subtract combo.
 */
function isSubtractKey(key) {
  return key && key.includes('-minus-');
}

/**
 * Load all element combinations from the database and build lookup indexes.
 * Includes both add and subtract combos, tagged with their operator type.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{combosByInput: Map, combosByResult: Map, pairToResult: Map}>}
 */
export async function loadCombinations(supabase) {
  let allCombinations = [];
  let page = 0;
  // Use 1000 to stay within Supabase's default PGRST_MAX_ROWS limit.
  // A larger pageSize (e.g. 5000) silently truncates results to ~1000,
  // causing the loop to exit early and miss most combinations.
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: combinations, error } = await supabase
      .from('element_combinations')
      .select('element_a, element_b, result_element, result_emoji, combination_key')
      .not('element_a', 'eq', '_ADMIN')
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      logger.error('[AlchemyPathfinder] Database error loading combinations', {
        error: error.message,
      });
      throw new Error(`Database error: ${error.message}`);
    }

    if (combinations && combinations.length > 0) {
      allCombinations = allCombinations.concat(combinations);
      hasMore = combinations.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  // Build all indexes in a single pass
  const combosByInput = new Map(); // elementNameLower -> [combo, ...]
  const combosByResult = new Map(); // resultElementLower -> [combo, ...]
  const pairToResult = new Map(); // "a|b" sorted lowercase -> combo (add combos only)

  for (const combo of allCombinations) {
    const aLower = combo.element_a.toLowerCase();
    const bLower = combo.element_b.toLowerCase();
    const resultLower = combo.result_element.toLowerCase();

    // Tag each combo with its operator type
    combo.operator = isSubtractKey(combo.combination_key) ? '-' : '+';

    // pairToResult only tracks add combos (subtract keys are order-dependent)
    if (combo.operator === '+') {
      const pair = [aLower, bLower].sort().join('|');
      pairToResult.set(pair, combo);
    }

    // Index by each input element (both add and subtract)
    if (!combosByInput.has(aLower)) combosByInput.set(aLower, []);
    combosByInput.get(aLower).push(combo);
    if (aLower !== bLower) {
      if (!combosByInput.has(bLower)) combosByInput.set(bLower, []);
      combosByInput.get(bLower).push(combo);
    }

    // Index by result element
    if (!combosByResult.has(resultLower)) combosByResult.set(resultLower, []);
    combosByResult.get(resultLower).push(combo);
  }

  logger.info('[AlchemyPathfinder] Loaded combinations', {
    total: allCombinations.length,
    addCombos: Array.from(pairToResult.values()).length,
    subtractCombos: allCombinations.filter((c) => c.operator === '-').length,
    uniqueInputElements: combosByInput.size,
    uniqueResultElements: combosByResult.size,
  });

  return { combosByInput, combosByResult, pairToResult };
}

/**
 * Combination-centric forward BFS to find all elements reachable from starters.
 * Considers both add and subtract combos. Stores only the producing combo per
 * element (not merged paths) for efficient and correct path reconstruction.
 *
 * @param {Map} combosByInput - Map of elementNameLower -> combos using that element as input
 * @param {Map} pairToResult - Map of "a|b" sorted key -> canonical add combo
 * @returns {Map<string, {name: string, emoji: string, depth: number, producedBy: object|null}>}
 */
export function findAllReachable(combosByInput, pairToResult) {
  const elementInfo = new Map();

  // Initialize starters at depth 0
  for (const starter of STARTER_ELEMENTS) {
    elementInfo.set(starter.name.toLowerCase(), {
      name: starter.name,
      emoji: starter.emoji,
      depth: 0,
      producedBy: null,
    });
  }

  let frontier = new Set(STARTER_NAMES);
  let depth = 0;

  while (frontier.size > 0 && depth < 100) {
    depth++;
    const nextFrontier = new Set();

    for (const elementName of frontier) {
      const combos = combosByInput.get(elementName) || [];

      for (const combo of combos) {
        const aLower = combo.element_a.toLowerCase();
        const bLower = combo.element_b.toLowerCase();
        const resultLower = combo.result_element.toLowerCase();

        // Both inputs must already be available
        if (!elementInfo.has(aLower) || !elementInfo.has(bLower)) continue;

        // Only process if result is new
        if (elementInfo.has(resultLower)) continue;

        // For add combos, verify against the canonical pair result to skip stale dupes
        if (combo.operator === '+' && pairToResult) {
          const pair = [aLower, bLower].sort().join('|');
          const canonical = pairToResult.get(pair);
          if (canonical && canonical.result_element.toLowerCase() !== resultLower) continue;
        }

        elementInfo.set(resultLower, {
          name: combo.result_element,
          emoji: combo.result_emoji,
          depth,
          producedBy: combo,
        });

        nextFrontier.add(resultLower);
      }
    }

    frontier = nextFrontier;
  }

  logger.info('[AlchemyPathfinder] Forward BFS complete', {
    reachableElements: elementInfo.size - STARTER_NAMES.size,
    maxDepth: depth,
  });

  return elementInfo;
}

/**
 * Reconstruct an ordered path from starters to a target element using the
 * elementInfo map from findAllReachable. Uses recursive dependency collection
 * with topological ordering (prerequisites listed before dependent steps).
 * Includes operator (+/-) for each step.
 *
 * @param {string} elementLower - Target element name (lowercase)
 * @param {Map} elementInfo - Map from findAllReachable
 * @returns {Array<{element_a: string, element_b: string, result_element: string, result_emoji: string, operator: string}>}
 */
export function reconstructPath(elementLower, elementInfo) {
  const visited = new Set();
  const path = [];

  function collect(elLower) {
    if (visited.has(elLower)) return;
    visited.add(elLower);

    const info = elementInfo.get(elLower);
    if (!info || info.depth === 0) return; // Starter element

    const combo = info.producedBy;
    const aLower = combo.element_a.toLowerCase();
    const bLower = combo.element_b.toLowerCase();

    // Recursively collect prerequisites first
    collect(aLower);
    collect(bLower);

    // Then add this step (topological order)
    path.push({
      element_a: combo.element_a,
      element_b: combo.element_b,
      result_element: combo.result_element,
      result_emoji: combo.result_emoji,
      operator: combo.operator || '+',
    });
  }

  collect(elementLower);
  return path;
}

/**
 * Backward recursive search to find the shortest path from starters to a single
 * target element. Only explores the target's dependency chain, not all combinations.
 * Uses memoization and cycle detection. Supports both add and subtract combos.
 *
 * @param {string} targetLower - Target element name (lowercase)
 * @param {Map} combosByResult - Map of resultElementLower -> combos that produce it
 * @returns {{found: boolean, path?: Array, steps?: number, message?: string}}
 */
export function findShortestPathToTarget(targetLower, combosByResult) {
  // Memo: elementLower -> { depth, combo } or null (unreachable)
  const memo = new Map();
  const inProgress = new Set(); // Cycle detection

  // Starters have depth 0
  for (const starter of STARTER_ELEMENTS) {
    memo.set(starter.name.toLowerCase(), { depth: 0, combo: null });
  }

  function solve(elLower) {
    if (memo.has(elLower)) return memo.get(elLower);
    if (inProgress.has(elLower)) return null; // Cycle detected

    inProgress.add(elLower);

    const combos = combosByResult.get(elLower) || [];
    if (combos.length === 0) {
      memo.set(elLower, null);
      inProgress.delete(elLower);
      return null;
    }

    let bestResult = null;
    let bestDepth = Infinity;

    for (const combo of combos) {
      const aLower = combo.element_a.toLowerCase();
      const bLower = combo.element_b.toLowerCase();

      const resultA = solve(aLower);
      if (resultA === null) continue;

      const resultB = solve(bLower);
      if (resultB === null) continue;

      const candidateDepth = Math.max(resultA.depth, resultB.depth) + 1;

      if (candidateDepth < bestDepth) {
        bestDepth = candidateDepth;
        bestResult = { depth: bestDepth, combo };
      }
    }

    memo.set(elLower, bestResult);
    inProgress.delete(elLower);
    return bestResult;
  }

  const result = solve(targetLower);

  if (!result) {
    return {
      found: false,
      message: `No path found from starter elements to "${targetLower}"`,
    };
  }

  // Reconstruct path via topological DFS using the memo
  const visited = new Set();
  const path = [];

  function collectPath(elLower) {
    if (visited.has(elLower)) return;
    visited.add(elLower);

    const entry = memo.get(elLower);
    if (!entry || entry.depth === 0) return; // Starter

    const combo = entry.combo;
    const aLower = combo.element_a.toLowerCase();
    const bLower = combo.element_b.toLowerCase();

    collectPath(aLower);
    collectPath(bLower);

    path.push({
      element_a: combo.element_a,
      element_b: combo.element_b,
      result_element: combo.result_element,
      result_emoji: combo.result_emoji,
      operator: combo.operator || '+',
    });
  }

  collectPath(targetLower);

  return { found: true, path, steps: path.length };
}

/**
 * Fetch ALL past puzzle target elements (no date limit).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Set<string>>} Set of target element names (original case)
 */
export async function fetchAllPastTargets(supabase) {
  const { data: allPuzzles, error } = await supabase
    .from('element_soup_puzzles')
    .select('target_element');

  if (error) {
    logger.warn('[AlchemyPathfinder] Failed to fetch past targets', {
      error: error.message,
    });
    return new Set();
  }

  return new Set((allPuzzles || []).map((p) => p.target_element).filter(Boolean));
}
