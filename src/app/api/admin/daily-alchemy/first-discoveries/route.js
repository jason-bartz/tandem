import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/daily-alchemy/first-discoveries
 * Get a paginated list of first discoveries by players
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 100, max 200)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));

    logger.info('[FirstDiscoveries] Fetching discoveries', { page, limit });

    const supabase = createServerClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('element_soup_first_discoveries')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      logger.error('[FirstDiscoveries] Count error', { error: countError.message });
      return NextResponse.json(
        { error: 'Database error', message: countError.message },
        { status: 500 }
      );
    }

    // Get paginated discoveries ordered by discovered_at DESC (newest first)
    const offset = (page - 1) * limit;
    const { data, error } = await supabase
      .from('element_soup_first_discoveries')
      .select(
        'id, user_id, username, element_a, element_b, result_element, result_emoji, discovered_at, puzzle_date'
      )
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('[FirstDiscoveries] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Get usernames for any discoveries missing them
    const userIdsNeedingLookup = [
      ...new Set((data || []).filter((d) => !d.username && d.user_id).map((d) => d.user_id)),
    ];

    let usernameMap = {};
    if (userIdsNeedingLookup.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIdsNeedingLookup);

      if (profiles) {
        usernameMap = profiles.reduce((acc, p) => {
          acc[p.id] = p.username;
          return acc;
        }, {});
      }
    }

    // Transform data to camelCase, using looked-up usernames as fallback
    const discoveries = (data || []).map((d) => ({
      id: d.id,
      userId: d.user_id,
      username: d.username || usernameMap[d.user_id] || null,
      elementA: d.element_a,
      elementB: d.element_b,
      resultElement: d.result_element,
      resultEmoji: d.result_emoji || '✨',
      discoveredAt: d.discovered_at,
      puzzleDate: d.puzzle_date,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    logger.info('[FirstDiscoveries] Returning discoveries', {
      count: discoveries.length,
      total,
      page,
      totalPages,
    });

    return NextResponse.json({
      discoveries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('[FirstDiscoveries] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
