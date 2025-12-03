import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/user-reel-stats
 * Get user's aggregate Reel Connections stats from database
 * Used by useReelConnectionsStats hook for DATABASE-FIRST sync pattern
 * Requires authentication
 */
export async function GET(_request) {
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

    logger.info('[API] Fetching user reel stats from database', { user: user.id });

    // Get aggregate stats
    const { data, error } = await supabase
      .from('reel_user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats yet, return defaults
        logger.info('[API] No reel stats found, returning defaults', { user: user.id });
        return NextResponse.json({
          success: true,
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            totalTimeMs: 0,
            currentStreak: 0,
            bestStreak: 0,
            lastPlayedDate: null,
            gameHistory: [],
          },
        });
      }

      logger.error('[API] Error fetching user reel stats', { error });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Convert database format to client format (snake_case to camelCase)
    const stats = {
      gamesPlayed: data.games_played || 0,
      gamesWon: data.games_won || 0,
      totalTimeMs: data.total_time_ms || 0,
      currentStreak: data.current_streak || 0,
      bestStreak: data.best_streak || 0,
      lastPlayedDate: data.last_played_date || null,
      gameHistory: data.game_history || [],
    };

    logger.info('[API] User reel stats fetched successfully', {
      user: user.id,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      currentStreak: stats.currentStreak,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/user-reel-stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user-reel-stats
 * Save user's aggregate Reel Connections stats to database
 * Used by useReelConnectionsStats hook for DATABASE-FIRST sync pattern
 * Requires authentication
 *
 * Body: {
 *   gamesPlayed,
 *   gamesWon,
 *   totalTimeMs,
 *   currentStreak,
 *   bestStreak,
 *   lastPlayedDate,
 *   gameHistory
 * }
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
    const {
      gamesPlayed = 0,
      gamesWon = 0,
      totalTimeMs = 0,
      currentStreak = 0,
      bestStreak = 0,
      lastPlayedDate = null,
      gameHistory = [],
    } = body;

    logger.info('[API] Saving user reel stats to database', {
      user: user.id,
      gamesPlayed,
      gamesWon,
      currentStreak,
    });

    // Convert client format to database format (camelCase to snake_case)
    const dbStats = {
      user_id: user.id,
      games_played: gamesPlayed,
      games_won: gamesWon,
      total_time_ms: totalTimeMs,
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_played_date: lastPlayedDate,
      game_history: gameHistory,
      updated_at: new Date().toISOString(),
    };

    // Upsert (insert or update)
    const { data, error } = await supabase
      .from('reel_user_stats')
      .upsert(dbStats, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      logger.error('[API] Error saving user reel stats', { error });
      return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 });
    }

    // Convert back to client format
    const stats = {
      gamesPlayed: data.games_played || 0,
      gamesWon: data.games_won || 0,
      totalTimeMs: data.total_time_ms || 0,
      currentStreak: data.current_streak || 0,
      bestStreak: data.best_streak || 0,
      lastPlayedDate: data.last_played_date || null,
      gameHistory: data.game_history || [],
    };

    logger.info('[API] User reel stats saved successfully', {
      user: user.id,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in POST /api/user-reel-stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
