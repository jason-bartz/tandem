import { NextResponse } from 'next/server';
import { createServerComponentClient, createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

/**
 * Get authenticated user from either cookies or Authorization header
 * iOS apps send Bearer tokens, web uses cookies
 */
async function getAuthenticatedUser(request) {
  // First, try Bearer token from Authorization header (iOS/native)
  const authHeader =
    request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Create a Supabase client with the access token to verify it
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      // Return both user and a service client for database operations
      const serviceClient = createServerClient();
      return { user, supabase: serviceClient, source: 'bearer' };
    }
  }

  // Fall back to cookie-based auth (web)
  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return { user, supabase, source: 'cookie' };
  }

  return { user: null, supabase: null, source: null };
}

/**
 * GET /api/user-mini-stats
 * Get user's aggregate mini stats from database
 * Used by miniStorage.js for DATABASE-FIRST sync pattern
 * Requires authentication
 */
export async function GET(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[API] Fetching user mini stats from database', { user: user.id });

    // Get aggregate stats
    const { data, error } = await supabase
      .from('mini_user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats yet, return defaults
        logger.info('[API] No mini stats found, returning defaults', { user: user.id });
        return NextResponse.json({
          success: true,
          stats: {
            totalCompleted: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageTime: 0,
            bestTime: 0,
            perfectSolves: 0,
            totalChecks: 0,
            totalReveals: 0,
            completedPuzzles: {},
            lastPlayedDate: null,
          },
        });
      }

      logger.error('[API] Error fetching user mini stats', { error });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Convert database format to client format (snake_case to camelCase)
    const stats = {
      totalCompleted: data.total_completed || 0,
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
      averageTime: data.average_time || 0,
      bestTime: data.best_time || 0,
      perfectSolves: data.perfect_solves || 0,
      totalChecks: data.total_checks || 0,
      totalReveals: data.total_reveals || 0,
      completedPuzzles: data.completed_puzzles || {},
      lastPlayedDate: data.last_played_date || null,
    };

    logger.info('[API] User mini stats fetched successfully', {
      user: user.id,
      totalCompleted: stats.totalCompleted,
      currentStreak: stats.currentStreak,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/user-mini-stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user-mini-stats
 * Save user's aggregate mini stats to database
 * Used by miniStorage.js for DATABASE-FIRST sync pattern
 * Requires authentication
 *
 * Body: {
 *   totalCompleted,
 *   currentStreak,
 *   longestStreak,
 *   averageTime,
 *   bestTime,
 *   perfectSolves,
 *   totalChecks,
 *   totalReveals,
 *   completedPuzzles,
 *   lastPlayedDate
 * }
 */
export async function POST(request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      totalCompleted = 0,
      currentStreak = 0,
      longestStreak = 0,
      averageTime = 0,
      bestTime = 0,
      perfectSolves = 0,
      totalChecks = 0,
      totalReveals = 0,
      completedPuzzles = {},
      lastPlayedDate = null,
    } = body;

    logger.info('[API] Saving user mini stats to database', {
      user: user.id,
      totalCompleted,
      currentStreak,
    });

    // Convert client format to database format (camelCase to snake_case)
    const dbStats = {
      user_id: user.id,
      total_completed: totalCompleted,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      average_time: averageTime,
      best_time: bestTime,
      perfect_solves: perfectSolves,
      total_checks: totalChecks,
      total_reveals: totalReveals,
      completed_puzzles: completedPuzzles,
      last_played_date: lastPlayedDate,
      updated_at: new Date().toISOString(),
    };

    // Upsert (insert or update)
    const { data, error } = await supabase
      .from('mini_user_stats')
      .upsert(dbStats, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      logger.error('[API] Error saving user mini stats', { error });
      return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 });
    }

    // Convert back to client format
    const stats = {
      totalCompleted: data.total_completed || 0,
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
      averageTime: data.average_time || 0,
      bestTime: data.best_time || 0,
      perfectSolves: data.perfect_solves || 0,
      totalChecks: data.total_checks || 0,
      totalReveals: data.total_reveals || 0,
      completedPuzzles: data.completed_puzzles || {},
      lastPlayedDate: data.last_played_date || null,
    };

    logger.info('[API] User mini stats saved successfully', {
      user: user.id,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in POST /api/user-mini-stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
