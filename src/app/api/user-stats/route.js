/**
 * API Route: User Stats
 *
 * Manages user-specific game statistics stored in the database.
 * Allows authenticated users to sync their stats across devices.
 */

import { createServerComponentClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/user-stats
 * Retrieve authenticated user's stats from database
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

    // Get user's stats from database
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no stats found, return default stats
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          stats: {
            played: 0,
            wins: 0,
            currentStreak: 0,
            bestStreak: 0,
            lastStreakDate: null,
          },
        });
      }

      console.error('[User Stats API] Failed to fetch stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({
      stats: {
        played: data.played || 0,
        wins: data.wins || 0,
        currentStreak: data.current_streak || 0,
        bestStreak: data.best_streak || 0,
        lastStreakDate: data.last_streak_date || null,
      },
    });
  } catch (error) {
    console.error('[User Stats API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user-stats
 * Update user's stats in database (merge with existing)
 *
 * Request body:
 * {
 *   played: number,
 *   wins: number,
 *   currentStreak: number,
 *   bestStreak: number,
 *   lastStreakDate: string (YYYY-MM-DD) or null
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
    const { played, wins, currentStreak, bestStreak, lastStreakDate } = await request.json();

    // Validate input
    if (
      typeof played !== 'number' ||
      typeof wins !== 'number' ||
      typeof currentStreak !== 'number' ||
      typeof bestStreak !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid stats format' }, { status: 400 });
    }

    // Get existing stats for merging
    const { data: existingData } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Merge stats (take max values to ensure no data loss)
    const mergedStats = {
      user_id: user.id,
      played: Math.max(played, existingData?.played || 0),
      wins: Math.max(wins, existingData?.wins || 0),
      best_streak: Math.max(bestStreak, existingData?.best_streak || 0),
      current_streak: currentStreak, // Will be determined by most recent date below
      last_streak_date: lastStreakDate,
    };

    // For current streak, use the one with the most recent date
    const existingDate = existingData?.last_streak_date;
    const newDate = lastStreakDate;

    if (existingDate && newDate) {
      if (newDate >= existingDate) {
        mergedStats.current_streak = currentStreak;
        mergedStats.last_streak_date = newDate;
      } else {
        mergedStats.current_streak = existingData.current_streak || 0;
        mergedStats.last_streak_date = existingDate;
      }
    } else if (existingDate) {
      mergedStats.current_streak = existingData.current_streak || 0;
      mergedStats.last_streak_date = existingDate;
    }

    // Upsert stats (insert or update)
    const { data, error } = await supabase
      .from('user_stats')
      .upsert(mergedStats, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[User Stats API] Failed to update stats:', error);
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: {
        played: data.played,
        wins: data.wins,
        currentStreak: data.current_streak,
        bestStreak: data.best_streak,
        lastStreakDate: data.last_streak_date,
      },
    });
  } catch (error) {
    console.error('[User Stats API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
