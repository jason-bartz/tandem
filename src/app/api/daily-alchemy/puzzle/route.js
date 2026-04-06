import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS, normalizeKey } from '@/lib/daily-alchemy.constants';

/**
 * Get today's date in YYYY-MM-DD format based on ET timezone
 * (Puzzles reset at midnight Eastern Time)
 */
function getCurrentPuzzleDate() {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate and correct a solution path against the actual element_combinations table.
 * Replaces any step whose result doesn't match the real DB combination.
 */
async function validateSolutionPath(solutionPath, supabase) {
  if (!solutionPath || solutionPath.length === 0) return solutionPath;

  // Collect all combination keys from the path (using correct key format per operator)
  const keys = solutionPath.map((step) => {
    if (step.operator === '-') {
      return `${step.elementA.toLowerCase().trim()}-minus-${step.elementB.toLowerCase().trim()}`;
    }
    return normalizeKey(step.elementA, step.elementB);
  });

  // Batch query the DB for all combinations in the path
  const { data: dbCombos, error } = await supabase
    .from('element_combinations')
    .select('combination_key, result_element, result_emoji')
    .in('combination_key', keys);

  if (error || !dbCombos) {
    logger.warn('[API] Failed to validate solution path, returning as-is', {
      error: error?.message,
    });
    return solutionPath;
  }

  // Build lookup map
  const comboMap = new Map();
  for (const combo of dbCombos) {
    comboMap.set(combo.combination_key, combo);
  }

  // Correct any mismatched steps
  let corrected = 0;
  const validatedPath = solutionPath.map((step) => {
    const key =
      step.operator === '-'
        ? `${step.elementA.toLowerCase().trim()}-minus-${step.elementB.toLowerCase().trim()}`
        : normalizeKey(step.elementA, step.elementB);
    const dbCombo = comboMap.get(key);

    if (dbCombo && dbCombo.result_element.toLowerCase() !== step.result.toLowerCase()) {
      corrected++;
      return {
        ...step,
        result: dbCombo.result_element,
        emoji: dbCombo.result_emoji,
      };
    }

    return step;
  });

  if (corrected > 0) {
    logger.warn('[API] Corrected stale solution path steps', {
      corrected,
      total: solutionPath.length,
    });
  }

  return validatedPath;
}

/**
 * Complete a solution path by filling in missing intermediate steps.
 * Walks the path and for any step whose inputs aren't yet available,
 * recursively looks up those elements in the DB and inserts prerequisite steps.
 * Returns null if the path cannot be completed (missing DB combos).
 */
async function completeSolutionPath(solutionPath, supabase) {
  if (!solutionPath || solutionPath.length === 0) return null;

  const starterNames = new Set(STARTER_ELEMENTS.map((s) => s.name.toLowerCase()));
  const available = new Set(starterNames);

  // Check if path is already complete
  let isComplete = true;
  for (const step of solutionPath) {
    if (
      !available.has(step.elementA.toLowerCase()) ||
      !available.has(step.elementB.toLowerCase())
    ) {
      isComplete = false;
      break;
    }
    available.add(step.result.toLowerCase());
  }

  if (isComplete) return solutionPath;

  // Collect all missing elements we need to look up
  available.clear();
  for (const name of starterNames) available.add(name);

  const missing = new Set();
  for (const step of solutionPath) {
    const aLower = step.elementA.toLowerCase();
    const bLower = step.elementB.toLowerCase();
    if (!available.has(aLower)) missing.add(aLower);
    if (!available.has(bLower)) missing.add(bLower);
    available.add(step.result.toLowerCase());
  }

  if (missing.size === 0) return solutionPath;

  // Collect original-case names for missing elements from the path steps
  const missingOriginalCase = new Set();
  for (const step of solutionPath) {
    if (missing.has(step.elementA.toLowerCase())) missingOriginalCase.add(step.elementA);
    if (missing.has(step.elementB.toLowerCase())) missingOriginalCase.add(step.elementB);
  }

  // Look up how to make each missing element from the DB
  const { data: combos, error } = await supabase
    .from('element_combinations')
    .select('element_a, element_b, result_element, result_emoji, combination_key')
    .in('result_element', Array.from(missingOriginalCase));

  if (error || !combos || combos.length === 0) {
    logger.warn('[API] Could not look up missing intermediate elements', {
      missing: Array.from(missingOriginalCase),
      error: error?.message,
    });
    return null;
  }

  // Build map of result_element_lower -> [combos] (all matches)
  const combosByResult = new Map();
  for (const combo of combos) {
    const key = combo.result_element.toLowerCase();
    if (!combosByResult.has(key)) combosByResult.set(key, []);
    combosByResult.get(key).push(combo);
  }

  // Elements already produced by the stored path
  const pathProduces = new Set(solutionPath.map((s) => s.result.toLowerCase()));

  // Recursively resolve prerequisites for a missing element.
  // Prefers combos whose inputs are starters or already in the stored path.
  const resolved = new Map(); // elementLower -> step object
  const resolving = new Set(); // cycle detection

  function resolve(elementLower) {
    if (starterNames.has(elementLower)) return true;
    if (resolved.has(elementLower)) return true;
    if (pathProduces.has(elementLower)) return true;
    if (resolving.has(elementLower)) return false;

    const candidates = combosByResult.get(elementLower);
    if (!candidates || candidates.length === 0) return false;

    resolving.add(elementLower);

    // Try each candidate combo, prefer ones whose inputs are already available
    for (const combo of candidates) {
      const aLower = combo.element_a.toLowerCase();
      const bLower = combo.element_b.toLowerCase();

      if (resolve(aLower) && resolve(bLower)) {
        const isSubtract = combo.combination_key && combo.combination_key.includes('-minus-');
        resolved.set(elementLower, {
          elementA: combo.element_a,
          elementB: combo.element_b,
          result: combo.result_element,
          emoji: combo.result_emoji,
          operator: isSubtract ? '-' : '+',
        });
        resolving.delete(elementLower);
        return true;
      }
    }

    resolving.delete(elementLower);
    return false;
  }

  // Resolve all missing elements
  for (const m of missing) {
    if (!resolve(m)) {
      logger.warn('[API] Could not resolve prerequisite chain for missing element', { element: m });
      return null;
    }
  }

  // Build the completed path: insert prerequisite steps before the step that needs them
  const completedPath = [];
  const added = new Set(starterNames);

  function ensureAvailable(elementLower) {
    if (added.has(elementLower)) return;
    const step = resolved.get(elementLower);
    if (!step) return;

    ensureAvailable(step.elementA.toLowerCase());
    ensureAvailable(step.elementB.toLowerCase());

    completedPath.push(step);
    added.add(elementLower);
  }

  for (const step of solutionPath) {
    ensureAvailable(step.elementA.toLowerCase());
    ensureAvailable(step.elementB.toLowerCase());

    if (!added.has(step.result.toLowerCase())) {
      completedPath.push(step);
      added.add(step.result.toLowerCase());
    }
  }

  // Re-number steps
  return completedPath.map((step, i) => ({ ...step, step: i + 1 }));
}

/**
 * GET /api/element-soup/puzzle
 * Get today's puzzle or a specific date's puzzle
 * Query params:
 * - date: ISO date string (YYYY-MM-DD) - optional
 * - startDate: ISO date string for range query - optional
 * - endDate: ISO date string for range query - optional
 * - limit: number of puzzles to return - optional
 */
export async function GET(request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    // If requesting a range of puzzles (for archive)
    if (startDate || endDate || limit) {
      const query = supabase
        .from('element_soup_puzzles')
        .select('id, date, puzzle_number, target_element, target_emoji, par_moves')
        .eq('published', true);

      if (startDate) {
        query.gte('date', startDate);
      }
      if (endDate) {
        query.lte('date', endDate);
      }

      // Don't return future puzzles
      const today = getCurrentPuzzleDate();
      query.lte('date', today);

      query.order('date', { ascending: false });

      if (limit) {
        const parsedLimit = parseInt(limit, 10);
        query.limit(Number.isNaN(parsedLimit) ? 50 : Math.min(Math.max(1, parsedLimit), 100));
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('[API] Error fetching element soup puzzles range', { error });
        return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        puzzles: data || [],
        total: count,
      });
    }

    // Get specific date or today's puzzle
    const targetDate = date || getCurrentPuzzleDate();

    logger.info('[API] Fetching element soup puzzle', { date: targetDate });

    const { data, error } = await supabase
      .from('element_soup_puzzles')
      .select(
        'id, puzzle_number, date, target_element, target_emoji, par_moves, difficulty, description, solution_path'
      )
      .eq('date', targetDate)
      .eq('published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No puzzle found
        logger.warn('[API] No element soup puzzle found for date', { date: targetDate });
        return NextResponse.json(
          {
            error:
              "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!",
          },
          { status: 404 }
        );
      }

      logger.error('[API] Error fetching element soup puzzle', { error });
      return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
    }

    logger.info('[API] Element soup puzzle fetched successfully', {
      date: data.date,
      number: data.puzzle_number,
      target: data.target_element,
    });

    // Validate solution path against actual DB combinations to fix stale/incorrect hints
    let solutionPath = await validateSolutionPath(data.solution_path || [], supabase);

    // If the path has gaps (missing intermediate steps), fill them in
    // by looking up the actual DB combinations for each missing element
    const completedPath = await completeSolutionPath(solutionPath, supabase);
    if (completedPath && completedPath.length > solutionPath.length) {
      logger.warn('[API] Solution path had gaps, filled in missing steps', {
        date: data.date,
        target: data.target_element,
        originalSteps: solutionPath.length,
        completedSteps: completedPath.length,
      });
      solutionPath = completedPath;
    }

    return NextResponse.json({
      success: true,
      puzzle: {
        id: data.id,
        number: data.puzzle_number,
        date: data.date,
        targetElement: data.target_element,
        targetEmoji: data.target_emoji,
        parMoves: data.par_moves,
        difficulty: data.difficulty,
        description: data.description || null,
        solutionPath,
      },
      starterElements: STARTER_ELEMENTS,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/element-soup/puzzle', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
