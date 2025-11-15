import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

/**
 * GET /api/leaderboard/streak
 * Fetch all-time best streak leaderboard for a specific game
 *
 * Query params:
 * - game: 'tandem' | 'cryptic'
 * - limit: number (default 10, max 100)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('game');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // Validation
    if (!gameType || !['tandem', 'cryptic'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    const supabase = await createServerComponentClient();

    // Call the database function to get streak leaderboard
    const { data: leaderboard, error: leaderboardError } = await supabase.rpc(
      'get_streak_leaderboard',
      {
        p_game_type: gameType,
        p_limit: limit,
      }
    );

    if (leaderboardError) {
      logger.error('[GET /api/leaderboard/streak] Error fetching leaderboard:', leaderboardError);
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

    // Also fetch current user's rank/streak if authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let userEntry = null;

    if (user) {
      const { data: entry, error: entryError } = await supabase
        .from('leaderboard_entries')
        .select('score, created_at')
        .eq('user_id', user.id)
        .eq('game_type', gameType)
        .eq('leaderboard_type', 'best_streak')
        .single();

      if (!entryError && entry) {
        const { count } = await supabase
          .from('leaderboard_entries')
          .select('*', { count: 'exact', head: true })
          .eq('game_type', gameType)
          .eq('leaderboard_type', 'best_streak')
          .gt('score', entry.score);

        userEntry = {
          score: entry.score,
          rank: (count || 0) + 1,
        };
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard || [],
      userEntry,
      gameType,
      total: leaderboard?.length || 0,
    });
  } catch (error) {
    logger.error('[GET /api/leaderboard/streak] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/streak
 * Submit a best streak to the leaderboard
 *
 * Body:
 * {
 *   gameType: 'tandem' | 'cryptic',
 *   streak: number
 * }
 *
 * Security features:
 * - Rate limiting (5 second cooldown)
 * - Streak validation (1-10000)
 * - User authentication required
 * - Can only submit own streak
 * - Only updates if streak improved
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
    const { gameType, streak } = body;

    // Validation
    if (!gameType || !['tandem', 'cryptic'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    if (!streak || typeof streak !== 'number' || streak <= 0 || streak > 10000) {
      return NextResponse.json(
        { error: 'Invalid streak (must be between 1 and 10000)' },
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

    // For streak leaderboards, we use today's date as a placeholder
    const today = new Date().toISOString().split('T')[0];
    const { data: entryId, error: submitError } = await supabase.rpc('submit_leaderboard_score', {
      p_user_id: user.id,
      p_game_type: gameType,
      p_leaderboard_type: 'best_streak',
      p_puzzle_date: today,
      p_score: streak,
      p_metadata: {},
    });

    if (submitError) {
      // Check for specific error messages
      if (submitError.message?.includes('Rate limit')) {
        return NextResponse.json({ error: 'Please wait before submitting again' }, { status: 429 });
      }
      if (submitError.message?.includes('Leaderboards disabled')) {
        return NextResponse.json({ error: 'Leaderboards are disabled' }, { status: 403 });
      }

      logger.error('[POST /api/leaderboard/streak] Error submitting streak:', submitError);
      return NextResponse.json({ error: 'Failed to submit streak' }, { status: 500 });
    }

    // Fetch user's updated rank
    const { data: entry } = await supabase
      .from('leaderboard_entries')
      .select('score')
      .eq('user_id', user.id)
      .eq('game_type', gameType)
      .eq('leaderboard_type', 'best_streak')
      .single();

    let userRank = null;
    if (entry) {
      const { count } = await supabase
        .from('leaderboard_entries')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', gameType)
        .eq('leaderboard_type', 'best_streak')
        .gt('score', entry.score);

      userRank = {
        score: entry.score,
        rank: (count || 0) + 1,
      };
    }

    return NextResponse.json({
      success: true,
      entryId,
      userRank,
      message: entryId ? 'Streak submitted successfully' : 'Streak not improved',
    });
  } catch (error) {
    logger.error('[POST /api/leaderboard/streak] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
