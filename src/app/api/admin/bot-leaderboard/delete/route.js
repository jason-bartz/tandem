import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteBotEntries } from '@/services/botLeaderboard.service';
import logger from '@/lib/logger';

/**
 * DELETE /api/admin/bot-leaderboard/delete
 * Delete bot entries for a specific game and date
 *
 * Query params:
 * - gameType: string (tandem|mini|reel|soup)
 * - date: string (YYYY-MM-DD)
 */
export async function DELETE(request) {
  try {
    // Verify admin authentication with CSRF validation
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const date = searchParams.get('date');

    // Validation
    if (!gameType || !['tandem', 'mini', 'reel', 'soup'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid or missing game type' }, { status: 400 });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid or missing date (use YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const result = await deleteBotEntries(gameType, date);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[DELETE /api/admin/bot-leaderboard/delete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
