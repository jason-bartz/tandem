import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

/**
 * GET /api/leaderboard/daily
 * Fetch daily speed leaderboard for a specific game/date
 *
 * Query params:
 * - game: 'tandem' | 'cryptic'
 * - date: 'YYYY-MM-DD'
 * - limit: number (default 10, max 100)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('game');
    const date = searchParams.get('date');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // Validation
    if (!gameType || !['tandem', 'cryptic'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
    }

    const supabase = await createServerComponentClient();

    // Call the database function to get leaderboard
    const { data: leaderboard, error: leaderboardError } = await supabase.rpc(
      'get_daily_leaderboard',
      {
        p_game_type: gameType,
        p_puzzle_date: date,
        p_limit: limit,
      }
    );

    if (leaderboardError) {
      logger.error('[GET /api/leaderboard/daily] Error fetching leaderboard:', leaderboardError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Enrich leaderboard with avatar data
    if (leaderboard && leaderboard.length > 0) {
      const userIds = leaderboard.map((entry) => entry.user_id);

      // Fetch avatar data for all users in the leaderboard
      // Use service role client to bypass RLS for reading public leaderboard avatar data
      const adminClient = createServerClient();
      const { data: usersWithAvatars, error: avatarError } = await adminClient
        .from('users')
        .select(
          `
          id,
          selected_avatar_id,
          avatars:selected_avatar_id (
            image_path
          )
        `
        )
        .in('id', userIds);

      if (!avatarError && usersWithAvatars) {
        // Create a map of user_id -> avatar_image_path
        const avatarMap = {};
        usersWithAvatars.forEach((user) => {
          if (user.avatars && user.avatars.image_path) {
            avatarMap[user.id] = user.avatars.image_path;
          }
        });

        // Enrich leaderboard entries with avatar data
        // Note: We explicitly remove avatar_url from RPC response as it may have incorrect paths
        // and replace it with the correct avatar_image_path from the avatars table
        leaderboard = leaderboard.map((entry) => {
          // eslint-disable-next-line no-unused-vars
          const { avatar_url, ...entryWithoutAvatarUrl } = entry;
          return {
            ...entryWithoutAvatarUrl,
            avatar_image_path: avatarMap[entry.user_id] || null,
          };
        });
      }
    }

    // Also fetch current user's rank if authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let userRank = null;

    if (user) {
      const { data: rankData, error: rankError } = await supabase.rpc('get_user_daily_rank', {
        p_user_id: user.id,
        p_game_type: gameType,
        p_puzzle_date: date,
      });

      if (!rankError && rankData && rankData.length > 0) {
        userRank = rankData[0];
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard || [],
      userRank,
      gameType,
      date,
      total: leaderboard?.length || 0,
    });
  } catch (error) {
    logger.error('[GET /api/leaderboard/daily] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/daily
 * Submit a score to the daily speed leaderboard
 *
 * Body:
 * {
 *   gameType: 'tandem' | 'cryptic',
 *   puzzleDate: 'YYYY-MM-DD',
 *   score: number (time in seconds),
 *   metadata: { hintsUsed?, mistakes?, attempts? }
 * }
 *
 * Security features:
 * - Rate limiting (5 second cooldown between submissions)
 * - Score validation (1-7200 seconds)
 * - User authentication required
 * - Can only submit own scores
 * - Only updates if score improved
 */
export async function POST(request) {
  try {
    const supabase = await createServerComponentClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gameType, puzzleDate, score, metadata = {} } = body;

    // Validation
    if (!gameType || !['tandem', 'cryptic'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!puzzleDate || !/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate)) {
      return NextResponse.json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
    }

    if (!score || typeof score !== 'number' || score <= 0 || score > 7200) {
      return NextResponse.json(
        { error: 'Invalid score (must be between 1 and 7200 seconds)' },
        { status: 400 }
      );
    }

    const { data: prefs } = await supabase
      .from('leaderboard_preferences')
      .select('enabled')
      .eq('user_id', user.id)
      .single();

    if (prefs && prefs.enabled === false) {
      return NextResponse.json({ error: 'Leaderboards disabled for this user' }, { status: 403 });
    }

    const { data: entryId, error: submitError } = await supabase.rpc('submit_leaderboard_score', {
      p_user_id: user.id,
      p_game_type: gameType,
      p_leaderboard_type: 'daily_speed',
      p_puzzle_date: puzzleDate,
      p_score: score,
      p_metadata: metadata,
    });

    if (submitError) {
      // Check for specific error messages
      if (submitError.message?.includes('Rate limit')) {
        return NextResponse.json({ error: 'Please wait before submitting again' }, { status: 429 });
      }
      if (submitError.message?.includes('Leaderboards disabled')) {
        return NextResponse.json({ error: 'Leaderboards are disabled' }, { status: 403 });
      }

      logger.error('[POST /api/leaderboard/daily] Error submitting score:', submitError);
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
    }

    // Fetch user's updated rank
    const { data: rankData } = await supabase.rpc('get_user_daily_rank', {
      p_user_id: user.id,
      p_game_type: gameType,
      p_puzzle_date: puzzleDate,
    });

    const userRank = rankData && rankData.length > 0 ? rankData[0] : null;

    return NextResponse.json({
      success: true,
      entryId,
      userRank,
      message: entryId ? 'Score submitted successfully' : 'Score not improved',
    });
  } catch (error) {
    logger.error('[POST /api/leaderboard/daily] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
