import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPuzzlesRange } from '@/lib/db';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { parseAndValidateJson, sanitizeErrorMessage } from '@/lib/security/validation';
import { z } from 'zod';
import logger from '@/lib/logger';

const generatePuzzleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeThemes: z.array(z.string()).optional().default([]),
  includePastDays: z.number().min(7).max(365).optional().default(180),
  includeFutureDays: z.number().min(0).max(90).optional().default(14),
  themeHint: z.string().max(100).optional(),
  themeContext: z.string().max(500).optional(),
});

export async function POST(request) {
  const startTime = logger.time('generate-puzzle');
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
      logger.warn('AI generation authentication failed');
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
    const body = await parseAndValidateJson(request, generatePuzzleSchema);
    const { date, excludeThemes, includePastDays, includeFutureDays, themeHint, themeContext } =
      body;

    // Get recent and future puzzles for context (to ensure variety)
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - includePastDays);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + includeFutureDays); // Look forward to avoid future duplicates

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    let contextPuzzlesData = {};
    try {
      const response = await getPuzzlesRange(startDateStr, endDateStr);
      contextPuzzlesData = response || {};
    } catch (error) {
      logger.warn('Could not fetch context puzzles for AI generation', error);
      // Continue without context - not a fatal error
    }

    // Convert context puzzles to array format for AI service (includes both past and future)
    const pastPuzzles = Object.entries(contextPuzzlesData)
      .filter(([puzzleDate]) => puzzleDate !== date) // Exclude the target date itself
      .map(([puzzleDate, puzzle]) => ({
        date: puzzleDate,
        theme: puzzle.theme,
        puzzles: puzzle.puzzles,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    // Generate puzzle using AI
    const generatedPuzzle = await aiService.generatePuzzle({
      date,
      pastPuzzles,
      excludeThemes,
      themeHint,
      themeContext,
    });
    const duration = logger.timeEnd('generate-puzzle', startTime);

    logger.debug('AI puzzle generated successfully', {
      date,
      theme: generatedPuzzle.theme,
      duration,
      pastPuzzlesAnalyzed: pastPuzzles.length,
      admin: authResult.admin?.username,
    });

    return NextResponse.json({
      success: true,
      puzzle: generatedPuzzle,
      context: {
        pastPuzzlesAnalyzed: pastPuzzles.length,
        excludedThemes: excludeThemes.length,
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

    if (error.message.includes('AI generation')) {
      logger.error('AI generation failed', error);
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    if (error.message.includes('Validation error') || error.message.includes('Invalid')) {
      logger.error('AI generation validation error', error);
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    if (error.message.includes('rate limit')) {
      logger.error('AI generation rate limit error', error);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    logger.error('AI puzzle generation failed', error);
    return NextResponse.json(
      {
        success: false,
        error: message || 'Failed to generate puzzle. Please try again.',
      },
      { status: 500 }
    );
  }
}
