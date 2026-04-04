import { NextResponse } from 'next/server';
import { checkMissingPuzzles } from '@/lib/puzzleAlertChecker';
import logger from '@/lib/logger';

/**
 * Vercel Cron endpoint for checking missing puzzles and sending Discord alerts
 * Runs every hour — the checker itself respects the configured check_interval_hours cooldown
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isDevelopment && !isVercelCron) {
      logger.warn('[Cron Puzzle Alerts] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[Cron Puzzle Alerts] Running puzzle alert check');

    const result = await checkMissingPuzzles();

    logger.info('[Cron Puzzle Alerts] Check complete', result);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('[Cron Puzzle Alerts] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
