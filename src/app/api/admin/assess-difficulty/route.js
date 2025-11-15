import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

export async function POST(request) {
  try {
    // Apply rate limiting for AI operations (30 per hour)
    const rateLimitResponse = await withRateLimit(request, 'ai_generation');
    if (rateLimitResponse) {
      logger.warn('AI assessment rate limit exceeded');
      return rateLimitResponse;
    }

    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      logger.warn('AI assessment authentication failed');
      return authResult.error;
    }

    const body = await request.json();
    const { theme, puzzles } = body;

    // Validate input
    if (!theme || !Array.isArray(puzzles) || puzzles.length !== 4) {
      return NextResponse.json(
        { success: false, error: 'Invalid puzzle data. Expected theme and 4 puzzles.' },
        { status: 400 }
      );
    }

    // Validate each puzzle has required fields
    for (const puzzle of puzzles) {
      if (!puzzle.emoji || !puzzle.answer) {
        return NextResponse.json(
          { success: false, error: 'Each puzzle must have emoji and answer fields.' },
          { status: 400 }
        );
      }
    }

    if (!aiService.isEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is not enabled. Please configure ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      );
    }

    // Assess difficulty using AI service
    const assessment = await aiService.assessDifficulty({ theme, puzzles });

    logger.info('Difficulty assessment successful', {
      theme,
      rating: assessment.rating,
      admin: authResult.admin?.username,
    });

    return NextResponse.json({
      success: true,
      assessment: {
        rating: assessment.rating,
        factors: assessment.factors,
        reasoning: assessment.reasoning,
      },
    });
  } catch (error) {
    logger.error('POST /api/admin/assess-difficulty error', error);

    // Check for rate limit errors
    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API rate limit reached. Please wait a moment and try again.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to assess difficulty' },
      { status: 500 }
    );
  }
}
