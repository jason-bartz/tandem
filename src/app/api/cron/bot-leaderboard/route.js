import { NextResponse } from 'next/server';
import { generateDailyBotEntries } from '@/services/botLeaderboard.service';
import logger from '@/lib/logger';

/**
 * Vercel Cron endpoint for generating bot leaderboard entries
 * Runs once daily at 2 AM UTC to generate bot leaderboard entries
 */
export async function GET(request) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');

    // In production, Vercel cron sends Bearer token
    // In development, allow requests from localhost
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isDevelopment && !isVercelCron) {
      logger.warn('[Cron Bot Leaderboard] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[Cron Bot Leaderboard] Starting bot entry generation');

    const result = await generateDailyBotEntries();

    if (result.success) {
      logger.info('[Cron Bot Leaderboard] Bot entries generated successfully', result);
      return NextResponse.json(result);
    } else {
      logger.error('[Cron Bot Leaderboard] Bot entry generation failed', result);
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    logger.error('[Cron Bot Leaderboard] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow POST as well (for manual triggering via Vercel dashboard)
export async function POST(request) {
  return GET(request);
}
