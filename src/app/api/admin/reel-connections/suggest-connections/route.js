import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * AI Connection Suggestion API for Reel Connections
 * Generates 3-4 connection ideas based on difficulty, avoiding recent connections
 */
export async function POST(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { difficulty = 'medium', existingConnections = [] } = body;

    // Fetch ALL historical connections to avoid duplicates and similar patterns
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
      // Continue without historical connections rather than failing
    }

    // Extract unique connection strings from all history
    const allConnections = allGroups
      ? [...new Set(allGroups.map((g) => g.connection).filter(Boolean))]
      : [];

    // Separate recent (last 90 days) from older connections for prioritization
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

    logger.info('Fetched historical connections for suggestion', {
      totalCount: allConnections.length,
      recentCount: recentConnections.length,
    });

    // Generate suggestions using AI
    const result = await aiService.suggestReelConnections({
      difficulty,
      recentConnections,
      allConnections,
      existingConnections,
    });

    return NextResponse.json({
      suggestions: result.suggestions,
      recentConnectionsCount: recentConnections.length,
      totalConnectionsCount: allConnections.length,
    });
  } catch (error) {
    logger.error('AI suggestion error:', error);

    // Handle specific AI errors
    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'AI service rate limit reached. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('authentication') || error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service authentication error. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
