import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';
import {
  loadCombinations,
  findAllReachable,
  reconstructPath,
} from '@/lib/server/alchemyPathfinder';

/**
 * GET /api/admin/daily-alchemy/shortest-path
 * Find the shortest combination path from starter elements to a target element
 * Uses forward BFS from starters for reliable path discovery
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
    const { combosByInput, pairToResult } = await loadCombinations(supabase);

    // Use forward BFS from starters to find all reachable elements with shortest paths
    const elementInfo = findAllReachable(combosByInput, pairToResult);

    // Check if target is reachable
    if (!elementInfo.has(targetLower)) {
      return NextResponse.json({
        target,
        found: false,
        message: `Element "${target}" is not reachable from starter elements`,
      });
    }

    const info = elementInfo.get(targetLower);
    if (info.depth === 0) {
      return NextResponse.json({
        target,
        isStarter: true,
        path: [],
        message: `${info.name} is a starter element`,
      });
    }

    // Reconstruct the path from starters to target
    const path = reconstructPath(targetLower, elementInfo);

    logger.info('[ShortestPath] Path found', {
      target,
      steps: path.length,
    });

    return NextResponse.json({
      target,
      found: true,
      steps: path.length,
      path,
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
