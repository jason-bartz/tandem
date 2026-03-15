import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/admin/reel-connections/suggest-full-puzzle
 * Suggests 4 connections (one per difficulty level) for a complete puzzle
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dismissedConnections = [], context = '' } = await request.json();

    // Fetch ALL historical connections
    const { data: allGroups, error: fetchError } = await supabase
      .from('reel_connections_groups')
      .select(
        `
        connection,
        puzzle:reel_connections_puzzles!inner(date)
      `
      )
      .order('puzzle(date)', { ascending: false });

    if (fetchError) {
      logger.error('Error fetching historical connections:', fetchError);
    }

    const allConnections = allGroups
      ? [...new Set(allGroups.map((g) => g.connection).filter(Boolean))]
      : [];

    // Recent connections (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

    const recentConnections = allGroups
      ? [
          ...new Set(
            allGroups
              .filter((g) => g.puzzle?.date >= ninetyDaysAgoStr)
              .map((g) => g.connection)
              .filter(Boolean)
          ),
        ]
      : [];

    logger.info('[SuggestFullPuzzle] Fetched historical connections', {
      total: allConnections.length,
      recent: recentConnections.length,
      dismissed: dismissedConnections.length,
    });

    const result = await aiService.suggestFullReelConnectionsPuzzle({
      recentConnections,
      allConnections,
      dismissedConnections,
      context,
    });

    return NextResponse.json({
      success: true,
      groups: result.groups,
      totalConnectionsCount: allConnections.length,
    });
  } catch (error) {
    logger.error('[SuggestFullPuzzle] Error:', error);

    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'AI service rate limit reached. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate full puzzle suggestions' },
      { status: 500 }
    );
  }
}
