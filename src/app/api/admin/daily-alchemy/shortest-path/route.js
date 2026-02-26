import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';
import { loadCombinations, findShortestPathToTarget } from '@/lib/server/alchemyPathfinder';

/**
 * GET /api/admin/daily-alchemy/shortest-path
 * Find the shortest combination path from starter elements to a target element
 * Uses backward recursive search with memoization for efficiency
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

    // Load all combinations and build indexes
    const { combosByResult } = await loadCombinations(supabase);

    // Check if target element exists as a result
    if (!combosByResult.has(targetLower)) {
      return NextResponse.json({
        target,
        found: false,
        message: `Element "${target}" not found as a result of any combination`,
      });
    }

    // Find shortest path using backward recursive search
    const result = findShortestPathToTarget(targetLower, combosByResult);

    if (!result.found) {
      return NextResponse.json({
        target,
        found: false,
        message: result.message,
      });
    }

    logger.info('[ShortestPath] Path found', {
      target,
      steps: result.steps,
    });

    return NextResponse.json({
      target,
      found: true,
      steps: result.steps,
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
