import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/daily-alchemy/discoveries
 * Get a paginated list of the authenticated user's first discoveries
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 100, max 200)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));

    const supabase = createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('[FirstDiscoveries] Fetching user discoveries', { userId: user.id, page, limit });

    // Get total count for this user
    const { count, error: countError } = await supabase
      .from('element_soup_first_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

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
      .select('id, element_a, element_b, result_element, result_emoji, discovered_at, puzzle_date')
      .eq('user_id', user.id)
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('[FirstDiscoveries] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Get emojis for all unique element names (elementA and elementB)
    const allElementNames = [...new Set((data || []).flatMap((d) => [d.element_a, d.element_b]))];

    let elementEmojiMap = {};
    if (allElementNames.length > 0) {
      // Look up emojis from element_combinations where these appear as results
      const { data: elements } = await supabase
        .from('element_combinations')
        .select('result_element, result_emoji')
        .in('result_element', allElementNames);

      if (elements) {
        elementEmojiMap = elements.reduce((acc, e) => {
          if (!acc[e.result_element]) {
            acc[e.result_element] = e.result_emoji || '✨';
          }
          return acc;
        }, {});
      }

      // Add starter elements
      const starters = { Earth: '🌍', Water: '💧', Fire: '🔥', Wind: '💨' };
      for (const [name, emoji] of Object.entries(starters)) {
        if (!elementEmojiMap[name]) {
          elementEmojiMap[name] = emoji;
        }
      }
    }

    // Transform data to camelCase with emojis
    const discoveries = (data || []).map((d) => ({
      id: d.id,
      elementA: d.element_a,
      elementAEmoji: elementEmojiMap[d.element_a] || '✨',
      elementB: d.element_b,
      elementBEmoji: elementEmojiMap[d.element_b] || '✨',
      resultElement: d.result_element,
      resultEmoji: d.result_emoji || '✨',
      discoveredAt: d.discovered_at,
      puzzleDate: d.puzzle_date,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    logger.info('[FirstDiscoveries] Returning user discoveries', {
      userId: user.id,
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
