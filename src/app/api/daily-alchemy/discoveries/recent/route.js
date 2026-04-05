import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DISCOVERY_LIMIT = 50;

/**
 * GET /api/daily-alchemy/discoveries/recent
 * Public endpoint — no auth required.
 * Returns the most recent first discoveries for the welcome-screen marquee.
 * Queries element_soup_first_discoveries directly (indexed on discovered_at DESC).
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('element_soup_first_discoveries')
      .select('result_element, result_emoji, username')
      .order('discovered_at', { ascending: false })
      .limit(DISCOVERY_LIMIT);

    if (error) {
      logger.error('[RecentDiscoveries] DB error', { error: error.message });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const discoveries = (data || []).map((d) => ({
      element: d.result_element,
      emoji: d.result_emoji || '✨',
      username: d.username || 'Anonymous',
    }));

    return NextResponse.json({ discoveries });
  } catch (err) {
    logger.error('[RecentDiscoveries] Unexpected error', { error: err.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
