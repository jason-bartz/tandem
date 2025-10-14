import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPuzzlesRange } from '@/lib/db';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { parseAndValidateJson, sanitizeErrorMessage } from '@/lib/security/validation';
import { z } from 'zod';

const generatePuzzleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeThemes: z.array(z.string()).optional().default([]),
  includePastDays: z.number().min(7).max(365).optional().default(180),
  includeFutureDays: z.number().min(0).max(90).optional().default(14),
});

export async function POST(request) {
  try {
    console.log('[generate-puzzle] Request received');
    console.log('[generate-puzzle] Environment check:', {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      keyLength: process.env.ANTHROPIC_API_KEY?.length,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10),
      aiEnabled: process.env.AI_GENERATION_ENABLED,
      nodeEnv: process.env.NODE_ENV,
      allAIKeys: Object.keys(process.env).filter(
        (k) => k.includes('AI') || k.includes('ANTHROPIC')
      ),
    });

    // Apply strict rate limiting for AI generation (10 per hour)
    const rateLimitResponse = await withRateLimit(request, 'write', { max: 10 });
    if (rateLimitResponse) {
      console.log('[generate-puzzle] Rate limit exceeded');
      return rateLimitResponse;
    }

    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      console.log('[generate-puzzle] Authentication failed');
      return authResult.error;
    }
    console.log('[generate-puzzle] Authentication successful');

    // Check if AI generation is enabled
    const aiEnabled = aiService.isEnabled();
    console.log('[generate-puzzle] AI service enabled check:', aiEnabled);

    if (!aiEnabled) {
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
    const { date, excludeThemes, includePastDays, includeFutureDays } = body;

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
      console.warn('Could not fetch context puzzles (past + future):', error);
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
    const startTime = Date.now();
    const generatedPuzzle = await aiService.generatePuzzle({
      date,
      pastPuzzles,
      excludeThemes,
    });
    const duration = Date.now() - startTime;

    // Log generation for monitoring (production analytics)
    console.log('AI puzzle generated:', {
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
    // Log full error details server-side for debugging
    console.error('[generate-puzzle] ERROR DETAILS:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      fullError: error,
    });

    const message = sanitizeErrorMessage(error);

    // Handle specific error types
    if (error.message.includes('AI generation')) {
      console.error('[generate-puzzle] AI generation error');
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    if (error.message.includes('Validation error') || error.message.includes('Invalid')) {
      console.error('[generate-puzzle] Validation error:', error.message);
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    if (error.message.includes('rate limit')) {
      console.error('[generate-puzzle] Rate limit exceeded');
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    console.error('[generate-puzzle] Unhandled error type');
    return NextResponse.json(
      {
        success: false,
        error: message || 'Failed to generate puzzle. Please try again.',
      },
      { status: 500 }
    );
  }
}
