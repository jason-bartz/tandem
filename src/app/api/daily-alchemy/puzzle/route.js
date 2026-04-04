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

  // Collect all combination keys from the path
  const keys = solutionPath.map((step) => normalizeKey(step.elementA, step.elementB));

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
    const key = normalizeKey(step.elementA, step.elementB);
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
    const solutionPath = await validateSolutionPath(data.solution_path || [], supabase);

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
