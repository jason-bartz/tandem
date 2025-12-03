import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { parseAndValidateJson, sanitizeErrorMessage } from '@/lib/security/validation';
import { z } from 'zod';
import logger from '@/lib/logger';

const assessDifficultySchema = z.object({
  theme: z.string().min(5).max(100),
  puzzles: z
    .array(
      z.object({
        emoji: z.string().min(1),
        answer: z.string().min(2).max(30),
        hint: z.string().optional(),
      })
    )
    .length(4),
});

export async function POST(request) {
  const startTime = logger.time('assess-difficulty');
  try {
    // Apply rate limiting for AI generation (30 per hour)
    const rateLimitResponse = await withRateLimit(request, 'ai_generation');
    if (rateLimitResponse) {
      logger.warn('AI generation rate limit exceeded');
      return rateLimitResponse;
    }

    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      logger.warn('AI difficulty assessment authentication failed');
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

    // Parse and validate request body
    const body = await parseAndValidateJson(request, assessDifficultySchema);
    const { theme, puzzles } = body;

    // Assess difficulty using AI
    const assessment = await aiService.assessDifficulty({
      theme,
      puzzles,
    });
    const duration = logger.timeEnd('assess-difficulty', startTime);

    logger.debug('AI difficulty assessed successfully', {
      theme,
      rating: assessment.rating,
      duration,
      admin: authResult.admin?.username,
    });

    return NextResponse.json({
      success: true,
      assessment,
      context: {
        generationTime: duration,
      },
    });
  } catch (error) {
    if (error.status === 429 || error.message.includes('rate_limit')) {
      logger.error('Anthropic rate limit exceeded', error);
      return NextResponse.json(
        {
          success: false,
          error: 'AI service rate limit reached. Please wait a moment and try again.',
          retryAfter: error.error?.retry_after || 60,
        },
        { status: 429 }
      );
    }

    if (
      error.status === 401 ||
      error.message.includes('authentication') ||
      error.message.includes('API key')
    ) {
      logger.error('Anthropic authentication failed', error);
      return NextResponse.json(
        { success: false, error: 'AI service authentication failed. Please contact support.' },
        { status: 503 }
      );
    }

    if (error.status === 529 || error.message.includes('overloaded')) {
      logger.error('Anthropic service overloaded', error);
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is temporarily overloaded. Please try again in a moment.',
        },
        { status: 503 }
      );
    }

    const message = sanitizeErrorMessage(error);

    if (error.message.includes('AI')) {
      logger.error('AI difficulty assessment failed', error);
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    if (error.message.includes('Validation error') || error.message.includes('Invalid')) {
      logger.error('AI difficulty assessment validation error', error);
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    if (error.message.includes('rate limit')) {
      logger.error('AI difficulty assessment rate limit error', error);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    logger.error('AI difficulty assessment failed', error);
    return NextResponse.json(
      {
        success: false,
        error: message || 'Failed to assess difficulty. Please try again.',
      },
      { status: 500 }
    );
  }
}
