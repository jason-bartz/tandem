import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/mini/stats
 * Get user's mini puzzle stats
 * Query params:
 * - date: ISO date string (YYYY-MM-DD) - get stats for specific puzzle
 * - aggregate: boolean - get aggregate stats instead
 */
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const aggregate = searchParams.get('aggregate') === 'true';

    // Get aggregate stats
    if (aggregate) {
      const { data, error } = await supabase
        .from('mini_user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No stats yet, return defaults
          return NextResponse.json({
            success: true,
            stats: {
              total_completed: 0,
              current_streak: 0,
              longest_streak: 0,
              average_time: 0,
              best_time: 0,
              perfect_solves: 0,
              total_checks: 0,
              total_reveals: 0,
              last_played_date: null,
            },
          });
        }

        logger.error('[API] Error fetching aggregate mini stats', { error });
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        stats: data,
      });
    }

    // Get stats for specific puzzle or all puzzles
    let query = supabase.from('mini_stats').select('*').eq('user_id', user.id);

    if (date) {
      query = query.eq('puzzle_date', date).single();
    } else {
      query = query.order('puzzle_date', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116' && date) {
        // No stats for this puzzle yet
        return NextResponse.json({
          success: true,
          stats: null,
        });
      }

      logger.error('[API] Error fetching mini stats', { error });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: data,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/mini/stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/mini/stats
 * Save user's mini puzzle stats
 * Body: {
 *   puzzle_date,
 *   completed,
 *   time_taken,
 *   checks_used,
 *   reveals_used,
 *   mistakes,
 *   perfect_solve,
 *   is_daily
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
    // eslint-disable-next-line no-unused-vars
    const {
      puzzle_date,
      completed,
      time_taken,
      checks_used = 0,
      reveals_used = 0,
      mistakes = 0,
      perfect_solve = false,
      is_daily = true,
    } = body;

    if (!puzzle_date || time_taken === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: puzzle_date, time_taken' },
        { status: 400 }
      );
    }

    logger.info('[API] Saving mini puzzle stats', { user: user.id, puzzle_date });

    // Upsert stats (update if exists, insert if not)
    // Keep the best time if puzzle was already completed
    const { data: existingStats } = await supabase
      .from('mini_stats')
      .select('time_taken')
      .eq('user_id', user.id)
      .eq('puzzle_date', puzzle_date)
      .single();

    let finalTimeTaken = time_taken;
    if (existingStats && existingStats.time_taken < time_taken) {
      // Keep the better (lower) time
      finalTimeTaken = existingStats.time_taken;
    }

    const { data, error } = await supabase
      .from('mini_stats')
      .upsert(
        {
          user_id: user.id,
          puzzle_date,
          time_taken: finalTimeTaken,
          checks_used,
          reveals_used,
          mistakes,
          perfect_solve,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,puzzle_date',
        }
      )
      .select()
      .single();

    if (error) {
      logger.error('[API] Error saving mini stats', { error });
      return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 });
    }

    // Update aggregate stats in mini_user_stats table
    // This could be done via a database trigger, but for now we'll do it here
    await updateAggregateStats(supabase, user.id);

    return NextResponse.json({
      success: true,
      stats: data,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in POST /api/mini/stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update aggregate user stats
 * @private
 */
async function updateAggregateStats(supabase, userId) {
  try {
    // Get all user's completed puzzles
    const { data: allStats, error: fetchError } = await supabase
      .from('mini_stats')
      .select('*')
      .eq('user_id', userId)
      .order('puzzle_date', { ascending: false });

    if (fetchError) {
      logger.error('[API] Error fetching stats for aggregate update', { fetchError });
      return;
    }

    if (!allStats || allStats.length === 0) {
      return;
    }

    // Calculate aggregate values
    const totalCompleted = allStats.length;
    const perfectSolves = allStats.filter((s) => s.perfect_solve === true).length;
    const totalChecks = allStats.reduce((sum, s) => sum + (s.checks_used || 0), 0);
    const totalReveals = allStats.reduce((sum, s) => sum + (s.reveals_used || 0), 0);

    const times = allStats.map((s) => s.time_taken).filter((t) => t > 0);
    const averageTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const bestTime = times.length > 0 ? Math.min(...times) : 0;

    // Calculate current streak (only daily puzzles)
    const currentStreak = calculateStreak(allStats);

    // Get longest streak from current stats or calculate from history
    const { data: currentUserStats } = await supabase
      .from('mini_user_stats')
      .select('longest_streak')
      .eq('user_id', userId)
      .single();

    const longestStreak = Math.max(
      currentUserStats?.longest_streak || 0,
      currentStreak
    );

    const lastPlayedDate = allStats[0]?.puzzle_date;

    // Build completed puzzles JSONB
    const completedPuzzles = {};
    allStats.forEach((stat) => {
      completedPuzzles[stat.puzzle_date] = {
        timeTaken: stat.time_taken,
        checksUsed: stat.checks_used || 0,
        revealsUsed: stat.reveals_used || 0,
        mistakes: stat.mistakes || 0,
        perfectSolve: stat.perfect_solve || false,
        completedAt: stat.completed_at,
        isDaily: true, // Assume daily unless specified
      };
    });

    // Upsert aggregate stats
    const { error: upsertError } = await supabase.from('mini_user_stats').upsert(
      {
        user_id: userId,
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
      },
      {
        onConflict: 'user_id',
      }
    );

    if (upsertError) {
      logger.error('[API] Error updating aggregate stats', { upsertError });
    }
  } catch (error) {
    logger.error('[API] Error in updateAggregateStats', { error: error.message });
  }
}

/**
 * Calculate current streak
 * Only counts daily puzzles, not archive
 * @private
 */
function calculateStreak(stats) {
  if (!stats || stats.length === 0) return 0;

  // Filter daily puzzles only
  const dailyPuzzles = stats.filter((s) => {
    // If no isDaily field, assume it's daily (backwards compat)
    return s.is_daily !== false;
  });

  if (dailyPuzzles.length === 0) return 0;

  const dates = dailyPuzzles.map((s) => s.puzzle_date).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);

  let streak = 0;
  const currentDate = new Date(todayDate);

  // Check if today is completed
  if (dates.includes(today)) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else {
    // Check yesterday (grace period)
    currentDate.setDate(currentDate.getDate() - 1);
    const yesterday = currentDate.toISOString().split('T')[0];

    if (!dates.includes(yesterday)) {
      return 0; // Streak broken
    }

    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count backwards
  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (dates.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
