import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { generateAllSuggestions } from '@/services/suggestionGenerator.service';
import logger from '@/lib/logger';

export const maxDuration = 300;

export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * POST /api/admin/suggestions/generate
 * Manually trigger suggestion generation from the admin panel
 *
 * Body:
 * - date: Target date (YYYY-MM-DD), defaults to tomorrow
 * - games: Array of game types to generate (default: all)
 * - force: Regenerate even if suggestions exist (default: false)
 */
export async function POST(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const body = await request.json().catch(() => ({}));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = body.date || tomorrow.toISOString().split('T')[0];
    const games = body.games || undefined;
    const force = body.force || false;

    logger.info('[AdminSuggestions] Manual generation triggered', {
      targetDate,
      games: games || 'all',
      force,
      user: authResult.user?.username,
    });

    const result = await generateAllSuggestions(targetDate, { games, force });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('[AdminSuggestions] Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
