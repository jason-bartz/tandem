import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { kv } from '@vercel/kv';
import logger from '@/lib/logger';

const CACHE_KEY = 'soup:recent-discoveries';
const CACHE_TTL = 60; // 60 seconds
const DISCOVERY_LIMIT = 50;

// Check if KV is available
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

/**
 * GET /api/daily-alchemy/discoveries/recent
 * Public endpoint — no auth required.
 * Returns the most recent first discoveries for the welcome-screen marquee.
 * Cached in Redis for 60s to protect the DB from traffic spikes.
 */
export async function GET() {
  try {
    // Try cache first
    if (isKvAvailable) {
      try {
        const cached = await kv.get(CACHE_KEY);
        if (cached) {
          return NextResponse.json(cached, {
            headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
          });
        }
      } catch (cacheErr) {
        logger.warn('[RecentDiscoveries] Cache read failed', { error: cacheErr.message });
      }
    }

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

    const payload = { discoveries };

    // Write to cache
    if (isKvAvailable) {
      try {
        await kv.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(payload));
      } catch (cacheErr) {
        logger.warn('[RecentDiscoveries] Cache write failed', { error: cacheErr.message });
      }
    }

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    logger.error('[RecentDiscoveries] Unexpected error', { error: err.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
