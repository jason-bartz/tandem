import { NextResponse } from 'next/server';
import authService from '@/services/auth.service';
import { getBotConfig, updateBotConfig } from '@/services/botLeaderboard.service';
import logger from '@/lib/logger';

/**
 * GET /api/admin/bot-leaderboard/config
 * Fetch bot leaderboard configuration
 */
export async function GET(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authService.verifyAdminToken(authHeader.replace('Bearer ', ''))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getBotConfig();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    logger.error('[GET /api/admin/bot-leaderboard/config] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/bot-leaderboard/config
 * Update bot leaderboard configuration
 *
 * Body: {
 *   enabled?: boolean,
 *   min_scores_per_day?: number,
 *   max_scores_per_day?: number,
 *   tandem_min_score?: number,
 *   tandem_max_score?: number,
 *   cryptic_min_score?: number,
 *   cryptic_max_score?: number,
 *   mini_min_score?: number,
 *   mini_max_score?: number,
 *   reel_min_score?: number,
 *   reel_max_score?: number,
 *   spread_throughout_day?: boolean
 * }
 */
export async function PUT(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authService.verifyAdminToken(authHeader.replace('Bearer ', ''))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate updates
    const allowedFields = [
      'enabled',
      'min_scores_per_day',
      'max_scores_per_day',
      'tandem_min_score',
      'tandem_max_score',
      'cryptic_min_score',
      'cryptic_max_score',
      'mini_min_score',
      'mini_max_score',
      'reel_min_score',
      'reel_max_score',
      'spread_throughout_day',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = await updateBotConfig(updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: result.config });
  } catch (error) {
    logger.error('[PUT /api/admin/bot-leaderboard/config] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
