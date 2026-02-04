import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

/**
 * Single Emoji Pair Regeneration API for Daily Tandem
 * Generates a new emoji pair for a given theme and answer
 */
export async function POST(request) {
  try {
    // Apply rate limiting for AI generation (30 per hour)
    const rateLimitResponse = await withRateLimit(request, 'ai_generation');
    if (rateLimitResponse) {
      logger.warn('AI emoji pair regeneration rate limit exceeded');
      return rateLimitResponse;
    }

    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      logger.warn('AI emoji pair regeneration authentication failed');
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

    const body = await request.json();
    const { theme, answer, context = '' } = body;

    if (!theme || theme.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Theme must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!answer || answer.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Answer must be at least 2 characters' },
        { status: 400 }
      );
    }

    logger.info('Generating single emoji pair', {
      theme: theme.trim(),
      answer: answer.trim(),
      hasContext: !!context,
    });

    // Generate emoji pair using AI
    const result = await aiService.generateSingleEmojiPair({
      theme: theme.trim(),
      answer: answer.trim().toUpperCase(),
      context: context?.trim() || '',
    });

    return NextResponse.json({
      success: true,
      emoji: result.emoji,
    });
  } catch (error) {
    logger.error('AI emoji pair regeneration error:', error);

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
      { success: false, error: error.message || 'Failed to generate emoji pair' },
      { status: 500 }
    );
  }
}
