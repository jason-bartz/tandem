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
    const { difficulty = 'medium' } = body;

    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

    // Fetch recent connections from the last 90 days
    const { data: recentGroups, error: fetchError } = await supabase
      .from('reel_connections_groups')
      .select(
        `
        connection,
        puzzle:reel_connections_puzzles!inner(date)
      `
      )
      .gte('puzzle.date', ninetyDaysAgoStr)
      .order('puzzle(date)', { ascending: false });

    if (fetchError) {
      logger.error('Error fetching recent connections:', fetchError);
      // Continue without recent connections rather than failing
    }

    // Extract unique connection strings
    const recentConnections = recentGroups
      ? [...new Set(recentGroups.map((g) => g.connection).filter(Boolean))]
      : [];

    logger.info('Fetched recent connections for suggestion', {
      count: recentConnections.length,
      ninetyDaysAgo: ninetyDaysAgoStr,
    });

    // Generate suggestions using AI
    const result = await aiService.suggestReelConnections({
      difficulty,
      recentConnections,
    });

    return NextResponse.json({
      suggestions: result.suggestions,
      recentConnectionsCount: recentConnections.length,
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
