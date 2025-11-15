/**
 * API Route: User Cryptic Stats
 *
 * Manages user-specific Daily Cryptic game statistics stored in the database.
 * Allows authenticated users to sync their cryptic stats across devices.
 */

import { createServerComponentClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/user-cryptic-stats
 * Retrieve authenticated user's cryptic stats from database
 */
export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's cryptic stats from database
    const { data, error } = await supabase
      .from('user_cryptic_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no stats found, return default stats
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          stats: {
            totalCompleted: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalHintsUsed: 0,
            perfectSolves: 0,
            averageTime: 0,
            completedPuzzles: {},
            lastPlayedDate: null,
          },
        });
      }

      console.error('[User Cryptic Stats API] Failed to fetch stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({
      stats: {
        totalCompleted: data.total_completed || 0,
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
        totalHintsUsed: data.total_hints_used || 0,
        perfectSolves: data.perfect_solves || 0,
        averageTime: data.average_time || 0,
        completedPuzzles: data.completed_puzzles || {},
        lastPlayedDate: data.last_played_date || null,
      },
    });
  } catch (error) {
    console.error('[User Cryptic Stats API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user-cryptic-stats
 * Update user's cryptic stats in database (merge with existing)
 *
 * Request body:
 * {
 *   totalCompleted: number,
 *   currentStreak: number,
 *   longestStreak: number,
 *   totalHintsUsed: number,
 *   perfectSolves: number,
 *   averageTime: number,
 *   completedPuzzles: object,
 *   lastPlayedDate: string (YYYY-MM-DD) or null
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createServerComponentClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const {
      totalCompleted,
      currentStreak,
      longestStreak,
      totalHintsUsed,
      perfectSolves,
      averageTime,
      completedPuzzles,
      lastPlayedDate,
    } = await request.json();

    // Validate input
    if (
      typeof totalCompleted !== 'number' ||
      typeof currentStreak !== 'number' ||
      typeof longestStreak !== 'number' ||
      typeof totalHintsUsed !== 'number' ||
      typeof perfectSolves !== 'number' ||
      typeof averageTime !== 'number' ||
      typeof completedPuzzles !== 'object'
    ) {
      return NextResponse.json({ error: 'Invalid stats format' }, { status: 400 });
    }

    // Get existing stats for merging
    const { data: existingData } = await supabase
      .from('user_cryptic_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Merge completed puzzles (combine both objects, keeping most recent data for duplicates)
    const mergedPuzzles = { ...(existingData?.completed_puzzles || {}) };
    for (const [date, puzzleData] of Object.entries(completedPuzzles || {})) {
      if (
        !mergedPuzzles[date] ||
        new Date(puzzleData.completedAt) > new Date(mergedPuzzles[date].completedAt)
      ) {
        mergedPuzzles[date] = puzzleData;
      }
    }

    const allTimes = Object.values(mergedPuzzles)
      .map((p) => p.timeTaken)
      .filter((t) => typeof t === 'number' && t > 0);
    const calculatedAvgTime =
      allTimes.length > 0
        ? Math.round(allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length)
        : 0;

    // Merge stats (take max values for cumulative stats)
    const mergedStats = {
      user_id: user.id,
      total_completed: Math.max(totalCompleted, existingData?.total_completed || 0),
      longest_streak: Math.max(longestStreak, existingData?.longest_streak || 0),
      total_hints_used: Math.max(totalHintsUsed, existingData?.total_hints_used || 0),
      perfect_solves: Math.max(perfectSolves, existingData?.perfect_solves || 0),
      average_time: calculatedAvgTime,
      completed_puzzles: mergedPuzzles,
      current_streak: currentStreak, // Will be determined by most recent date below
      last_played_date: lastPlayedDate,
    };

    // For current streak, use the one with the most recent date
    const existingDate = existingData?.last_played_date;
    const newDate = lastPlayedDate;

    if (existingDate && newDate) {
      if (newDate >= existingDate) {
        mergedStats.current_streak = currentStreak;
        mergedStats.last_played_date = newDate;
      } else {
        mergedStats.current_streak = existingData.current_streak || 0;
        mergedStats.last_played_date = existingDate;
      }
    } else if (existingDate) {
      mergedStats.current_streak = existingData.current_streak || 0;
      mergedStats.last_played_date = existingDate;
    }

    // Upsert stats (insert or update)
    const { data, error } = await supabase
      .from('user_cryptic_stats')
      .upsert(mergedStats, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[User Cryptic Stats API] Failed to update stats:', error);
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalCompleted: data.total_completed,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        totalHintsUsed: data.total_hints_used,
        perfectSolves: data.perfect_solves,
        averageTime: data.average_time,
        completedPuzzles: data.completed_puzzles,
        lastPlayedDate: data.last_played_date,
      },
    });
  } catch (error) {
    console.error('[User Cryptic Stats API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
