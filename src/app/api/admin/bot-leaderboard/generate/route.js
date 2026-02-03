import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  generateDailyBotEntries,
  generateBotEntries,
  getBotConfig,
} from '@/services/botLeaderboard.service';
import logger from '@/lib/logger';

/**
 * POST /api/admin/bot-leaderboard/generate
 * Manually trigger bot entry generation
 *
 * Body: {
 *   date?: string (YYYY-MM-DD, defaults to today),
 *   gameType?: string (tandem|mini|reel|soup, optional - if not provided, generates for all),
 *   count?: number (optional - overrides config)
 * }
 */
export async function POST(request) {
  try {
    // Verify admin authentication with CSRF validation
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { date: dateStr, gameType, count } = body;

    // Parse date
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Validate game type if provided
    if (gameType && !['tandem', 'mini', 'reel', 'soup'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    // If no specific game type, generate for all
    if (!gameType) {
      const result = await generateDailyBotEntries();
      return NextResponse.json(result);
    }

    // Generate for specific game
    const config = await getBotConfig();
    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const entryCount = count || config.min_scores_per_day;
    const generated = await generateBotEntries({
      gameType,
      date,
      count: entryCount,
      config,
    });

    return NextResponse.json({
      success: true,
      gameType,
      date: date.toISOString().split('T')[0],
      generated,
    });
  } catch (error) {
    logger.error('[POST /api/admin/bot-leaderboard/generate] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
