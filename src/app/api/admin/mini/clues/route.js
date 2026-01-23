import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

// Mark as dynamic route (skip for static export/iOS builds)
export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * POST /api/admin/mini/clues
 * Generate AI clues for crossword words
 *
 * Request body:
 * {
 *   words: [{ word: string, direction: 'across' | 'down', number: number, row: number, col: number }]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   clues: [{ word: string, direction: string, clue: string }]
 * }
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Parse request body
    const body = await request.json();
    const { words } = body;

    // Validate input
    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ success: false, error: 'No words provided' }, { status: 400 });
    }

    // Validate each word
    for (const word of words) {
      if (!word.word || typeof word.word !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid word format' }, { status: 400 });
      }
      if (word.direction !== 'across' && word.direction !== 'down') {
        return NextResponse.json({ success: false, error: 'Invalid direction' }, { status: 400 });
      }
    }

    logger.info('[Clues API] Generating clues for words', {
      count: words.length,
      words: words.map((w) => w.word),
    });

    // Check if AI is enabled
    if (!aiService.isEnabled()) {
      logger.error('[Clues API] AI service is not enabled');
      return NextResponse.json(
        {
          success: false,
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      );
    }

    // Generate clues using AI
    const clues = await aiService.generateCrosswordClues(words);

    // Map clues back to words with direction
    const cluesWithMeta = words.map((word, index) => ({
      word: word.word,
      direction: word.direction,
      number: word.number,
      clue: clues[index] || '',
    }));

    const elapsedTime = Date.now() - startTime;

    logger.info('[Clues API] Clues generated', {
      count: cluesWithMeta.length,
      elapsedTime,
    });

    return NextResponse.json({
      success: true,
      clues: cluesWithMeta,
      elapsedTime,
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    logger.error('[Clues API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate clues',
        elapsedTime,
      },
      { status: 500 }
    );
  }
}
