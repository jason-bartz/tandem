import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import { createServerClient } from '@/lib/supabase/server';
import { extractWordsFromPuzzles } from '@/lib/miniUtils';
import logger from '@/lib/logger';

// Default lookback period for word deduplication (in days)
const DEDUP_LOOKBACK_DAYS = 30;

// Percentage of recent words to exclude (80% = exclude most, allow some flexibility)
const EXCLUSION_PERCENTAGE = 0.8;

// Mark as dynamic route (skip for static export/iOS builds)
export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * Fetch words from recent mini puzzles to exclude from generation
 * This prevents repetition of words across puzzles
 * Returns ~80% of words to allow AI some flexibility
 */
async function getRecentlyUsedWords(lookbackDays = DEDUP_LOOKBACK_DAYS) {
  try {
    const supabase = createServerClient();

    // Calculate the start date for lookback period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const startDateStr = startDate.toISOString().split('T')[0];

    logger.info(
      `[Generator API] Fetching words from puzzles since ${startDateStr} (${lookbackDays} days)`
    );

    // Fetch recent puzzles
    const { data: puzzles, error } = await supabase
      .from('mini_puzzles')
      .select('solution')
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      logger.error('[Generator API] Error fetching recent puzzles:', error);
      return [];
    }

    // Extract all words from these puzzles
    const allWords = extractWordsFromPuzzles(puzzles);

    // Return ~80% of words (shuffled) to give AI some flexibility
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    const excludeCount = Math.ceil(shuffled.length * EXCLUSION_PERCENTAGE);
    const excludeWords = shuffled.slice(0, excludeCount);

    logger.info(
      `[Generator API] Found ${allWords.length} unique words from ${puzzles.length} puzzles, excluding ${excludeWords.length} (${Math.round(EXCLUSION_PERCENTAGE * 100)}%)`
    );

    return excludeWords;
  } catch (error) {
    logger.error('[Generator API] Error in getRecentlyUsedWords:', error);
    return [];
  }
}

/**
 * POST /api/admin/mini/generate
 * Generate a crossword puzzle using AI
 *
 * Request body:
 * {
 *   theme?: string    // Optional theme for themed puzzles
 * }
 *
 * Response:
 * {
 *   success: true,
 *   grid: Array<Array>,             // Grid with black squares and letters
 *   solution: Array<Array>,         // Complete solution grid (same as grid)
 *   words: [{word, direction, startRow, startCol}],
 *   clues: {across: [...], down: [...]},
 *   stats: {
 *     excludedWordsCount,
 *     elapsedTime
 *   }
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
    const body = await request.json().catch(() => ({}));
    const { theme = null } = body;

    logger.info(`[Generator API] Starting AI generation${theme ? ` with theme: "${theme}"` : ''}`);

    // Check if AI is enabled
    if (!aiService.isEnabled()) {
      logger.error('[Generator API] AI service is not enabled');
      return NextResponse.json(
        {
          success: false,
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      );
    }

    // Fetch recently used words to exclude from generation
    logger.info('[Generator API] Step 1: Fetching recently used words...');
    const excludeWords = await getRecentlyUsedWords();
    logger.info(`[Generator API] Step 1: Will exclude ${excludeWords.length} words ✓`);

    // Generate puzzle using AI
    logger.info('[Generator API] Step 2: Generating puzzle with AI...');
    const result = await aiService.generateMiniCrossword({
      excludeWords,
      theme,
    });

    const elapsedTime = Date.now() - startTime;

    logger.info(
      `[Generator API] Step 2: AI generation successful - ${result.words.length} words placed ✓`
    );
    logger.info(`[Generator API] Total time: ${elapsedTime}ms`);

    // Create empty grid (for display - only black squares)
    const displayGrid = result.grid.map((row) => row.map((cell) => (cell === '■' ? '■' : '')));

    return NextResponse.json({
      success: true,
      grid: displayGrid,
      solution: result.solution,
      words: result.words,
      clues: result.clues,
      stats: {
        excludedWordsCount: excludeWords.length,
        elapsedTime,
        generationType: 'ai',
        theme: theme || null,
      },
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    logger.error('[Generator API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate puzzle',
        stats: {
          elapsedTime,
          generationType: 'ai',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/mini/generate/status
 * Check if AI generation is available
 */
export async function GET(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const isEnabled = aiService.isEnabled();

    return NextResponse.json({
      enabled: isEnabled,
      generationType: 'ai',
      message: isEnabled
        ? 'AI generation is available'
        : 'AI generation is disabled. Please configure ANTHROPIC_API_KEY.',
    });
  } catch (error) {
    logger.error('[Generator API] Status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
