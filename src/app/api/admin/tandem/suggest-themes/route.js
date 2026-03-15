import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPuzzlesRange } from '@/lib/db';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

/**
 * AI Theme Suggestion API for Daily Tandem
 * Generates 3-4 theme ideas, avoiding recent themes from the last 120 days
 */
export async function POST(request) {
  try {
    // Apply rate limiting for AI generation (30 per hour)
    const rateLimitResponse = await withRateLimit(request, 'ai_generation');
    if (rateLimitResponse) {
      logger.warn('AI theme suggestion rate limit exceeded');
      return rateLimitResponse;
    }

    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      logger.warn('AI theme suggestion authentication failed');
      return authResult.error;
    }

    const aiEnabled = aiService.isEnabled();
    if (!aiEnabled) {
      logger.error(
        'AI generation service not enabled',
        new Error('ANTHROPIC_API_KEY not configured')
      );
      return NextResponse.json(
        {
          success: false,
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      );
    }

    const { dismissedThemes = [] } = await request.json();

    // Fetch ALL past puzzles to avoid repeating any theme ever used
    let recentThemes = [];
    try {
      // Use a wide date range to capture all historical puzzles
      const startDateStr = '2020-01-01';
      const endDateStr = new Date().toISOString().split('T')[0];
      const puzzlesData = await getPuzzlesRange(startDateStr, endDateStr);

      if (puzzlesData) {
        recentThemes = Object.values(puzzlesData)
          .map((puzzle) => puzzle.theme)
          .filter(Boolean);
        recentThemes = [...new Set(recentThemes)];
      }
    } catch (fetchError) {
      logger.error('Error fetching recent themes:', fetchError);
    }

    // Merge in dismissed themes from this session
    const allExcluded = [...new Set([...recentThemes, ...dismissedThemes])];

    logger.info('Fetched themes for suggestion exclusion', {
      pastThemes: recentThemes.length,
      dismissed: dismissedThemes.length,
      totalExcluded: allExcluded.length,
    });

    // Generate suggestions using AI
    const result = await aiService.suggestTandemThemes({
      recentThemes: allExcluded,
    });

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      recentThemesCount: recentThemes.length,
    });
  } catch (error) {
    logger.error('AI theme suggestion error:', error);

    // Handle specific AI errors
    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service rate limit reached. Please try again in a moment.',
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('authentication') || error.message?.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'AI service authentication error. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
