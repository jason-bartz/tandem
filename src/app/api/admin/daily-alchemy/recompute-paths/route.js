import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import logger from '@/lib/logger';
import {
  loadCombinations,
  findAllReachable,
  reconstructPath,
} from '@/lib/server/alchemyPathfinder';

/**
 * POST /api/admin/daily-alchemy/recompute-paths
 * Recompute solution paths for published puzzles using actual DB combinations.
 * Fixes stale/incorrect hints caused by AI-generated paths that conflict with real data.
 *
 * Body (optional):
 * - puzzleIds: number[] - Specific puzzle IDs to recompute (default: all published puzzles)
 * - dryRun: boolean - If true, only report what would change without updating (default: false)
 */
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const { puzzleIds, dryRun = false } = body;

    const supabase = createServerClient();

    // Load all combinations and build indexes for pathfinding
    const { combosByInput, pairToResult } = await loadCombinations(supabase);
    const elementInfo = findAllReachable(combosByInput, pairToResult);

    // Fetch puzzles to recompute
    let query = supabase
      .from('element_soup_puzzles')
      .select('id, date, target_element, target_emoji, solution_path')
      .eq('published', true)
      .order('date', { ascending: false });

    if (puzzleIds && puzzleIds.length > 0) {
      query = query.in('id', puzzleIds);
    }

    const { data: puzzles, error: fetchError } = await query;

    if (fetchError) {
      logger.error('[RecomputePaths] Failed to fetch puzzles', { error: fetchError.message });
      return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
    }

    const results = {
      total: puzzles.length,
      updated: 0,
      unchanged: 0,
      unreachable: 0,
      details: [],
    };

    for (const puzzle of puzzles) {
      const targetLower = puzzle.target_element?.toLowerCase();

      if (!targetLower || !elementInfo.has(targetLower)) {
        results.unreachable++;
        results.details.push({
          id: puzzle.id,
          date: puzzle.date,
          target: puzzle.target_element,
          status: 'unreachable',
        });
        continue;
      }

      // Reconstruct the path from actual DB combinations
      const rawPath = reconstructPath(targetLower, elementInfo);
      const newSolutionPath = rawPath.map((step, index) => ({
        step: index + 1,
        elementA: step.element_a,
        elementB: step.element_b,
        result: step.result_element,
        emoji: step.result_emoji,
        operator: step.operator || '+',
      }));

      // Compare with existing path
      const existingPath = puzzle.solution_path || [];
      const hasChanges =
        existingPath.length !== newSolutionPath.length ||
        existingPath.some((step, i) => {
          const newStep = newSolutionPath[i];
          return (
            !newStep ||
            step.result?.toLowerCase() !== newStep.result?.toLowerCase() ||
            step.elementA?.toLowerCase() !== newStep.elementA?.toLowerCase() ||
            step.elementB?.toLowerCase() !== newStep.elementB?.toLowerCase()
          );
        });

      if (hasChanges) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('element_soup_puzzles')
            .update({
              solution_path: newSolutionPath,
              par_moves: newSolutionPath.length,
            })
            .eq('id', puzzle.id);

          if (updateError) {
            logger.error('[RecomputePaths] Failed to update puzzle', {
              id: puzzle.id,
              error: updateError.message,
            });
            results.details.push({
              id: puzzle.id,
              date: puzzle.date,
              target: puzzle.target_element,
              status: 'error',
              error: updateError.message,
            });
            continue;
          }
        }

        results.updated++;
        results.details.push({
          id: puzzle.id,
          date: puzzle.date,
          target: puzzle.target_element,
          status: 'updated',
          oldSteps: existingPath.length,
          newSteps: newSolutionPath.length,
        });
      } else {
        results.unchanged++;
      }
    }

    logger.info('[RecomputePaths] Complete', {
      total: results.total,
      updated: results.updated,
      unchanged: results.unchanged,
      unreachable: results.unreachable,
      dryRun,
    });

    return NextResponse.json({
      success: true,
      dryRun,
      ...results,
    });
  } catch (error) {
    logger.error('[RecomputePaths] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
