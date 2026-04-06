import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { containsProfanity } from '@/utils/validation/profanityFilter';

const REDACTED_ELEMENT = '█████ REDACTED';
const REDACTED_EMOJI = '';

const ANONYMOUS_NAMES = [
  'Anonymous',
  'Unknown Player',
  'Bashful Player',
  'Unnamed Explorer',
  'Mystery Alchemist',
  'Secret Scientist',
  'Hidden Genius',
  'Incognito Player',
  'Shy Discoverer',
  'Nameless Wizard',
  'Quiet Tinkerer',
  'Shadow Alchemist',
  'Elusive Explorer',
  'Covert Chemist',
  'Undercover Player',
  'Masked Inventor',
  'Enigmatic Explorer',
  'Humble Alchemist',
  'Silent Genius',
  'Mysterious Stranger',
];

const DISCOVERY_LIMIT = 50;

/**
 * GET /api/daily-alchemy/discoveries/recent
 * Public endpoint — no auth required.
 * Returns the most recent first discoveries for the welcome-screen marquee.
 * Queries element_soup_first_discoveries directly (indexed on discovered_at DESC).
 */
export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

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

    const discoveries = (data || []).map((d) => {
      const flagged = containsProfanity(d.result_element);
      return {
        element: flagged ? REDACTED_ELEMENT : d.result_element,
        emoji: flagged ? REDACTED_EMOJI : d.result_emoji || '✨',
        username: d.username || ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)],
      };
    });

    return NextResponse.json({ discoveries });
  } catch (err) {
    logger.error('[RecentDiscoveries] Unexpected error', { error: err.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
