import { NextResponse } from 'next/server';
import { generateAllSuggestions } from '@/services/suggestionGenerator.service';
import logger from '@/lib/logger';

// Allow up to 5 minutes for parallel AI generation across all 4 games
export const maxDuration = 300;

/**
 * Cron endpoint for morning puzzle suggestion generation.
 * Generates puzzle options for all 4 games for tomorrow's date.
 *
 * Schedule: Daily at 6 AM ET (configured in vercel.json)
 * Auth: CRON_SECRET bearer token or development mode
 *
 * Query params:
 * - date: Override target date (YYYY-MM-DD), defaults to tomorrow
 * - games: Comma-separated game list (tandem,mini,soup,reel), defaults to all
 * - force: Set to "true" to regenerate even if suggestions exist
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isDevelopment && !isVercelCron) {
      logger.warn('[Cron GenerateSuggestions] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Target date: defaults to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = searchParams.get('date') || tomorrow.toISOString().split('T')[0];

    // Games filter
    const gamesParam = searchParams.get('games');
    const games = gamesParam ? gamesParam.split(',').map((g) => g.trim()) : undefined;

    // Force regeneration
    const force = searchParams.get('force') === 'true';

    logger.info('[Cron GenerateSuggestions] Starting generation', {
      targetDate,
      games: games || 'all',
      force,
    });

    const result = await generateAllSuggestions(targetDate, { games, force });

    logger.info('[Cron GenerateSuggestions] Generation complete', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('[Cron GenerateSuggestions] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
