import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/element-soup/stats
 * Get user's Element Soup stats
 * Query params:
 * - date: ISO date string (YYYY-MM-DD) - optional, get stats for specific puzzle
 */
export async function GET(request) {
  try {
    const supabase = createServerClient();

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

    // If requesting stats for a specific date
    if (date) {
      const { data: gameStats, error: gameError } = await supabase
        .from('element_soup_game_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('puzzle_date', date)
        .single();

      if (gameError && gameError.code !== 'PGRST116') {
        logger.error('[ElementSoup] Failed to fetch game stats', { error: gameError });
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        stats: gameStats || null,
      });
    }

    // Get aggregate stats
    const { data: aggregateStats, error: aggregateError } = await supabase
      .from('element_soup_user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (aggregateError && aggregateError.code !== 'PGRST116') {
      logger.error('[ElementSoup] Failed to fetch aggregate stats', { error: aggregateError });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Get recent game history
    const { data: recentGames, error: recentError } = await supabase
      .from('element_soup_game_stats')
      .select('puzzle_date, puzzle_number, time_taken, moves_count, par_moves, completed')
      .eq('user_id', user.id)
      .order('puzzle_date', { ascending: false })
      .limit(30);

    if (recentError) {
      logger.warn('[ElementSoup] Failed to fetch recent games', { error: recentError });
    }

    // Format stats for response
    const stats = aggregateStats
      ? {
          totalCompleted: aggregateStats.total_completed || 0,
          totalMoves: aggregateStats.total_moves || 0,
          bestTime: aggregateStats.best_time || null,
          averageTime: aggregateStats.average_time || null,
          currentStreak: aggregateStats.current_streak || 0,
          longestStreak: aggregateStats.longest_streak || 0,
          lastPlayedDate: aggregateStats.last_played_date || null,
          totalDiscoveries: aggregateStats.total_discoveries || 0,
          firstDiscoveries: aggregateStats.first_discoveries || 0,
          parStats: {
            underPar: aggregateStats.under_par_count || 0,
            atPar: aggregateStats.at_par_count || 0,
            overPar: aggregateStats.over_par_count || 0,
          },
        }
      : {
          totalCompleted: 0,
          totalMoves: 0,
          bestTime: null,
          averageTime: null,
          currentStreak: 0,
          longestStreak: 0,
          lastPlayedDate: null,
          totalDiscoveries: 0,
          firstDiscoveries: 0,
          parStats: {
            underPar: 0,
            atPar: 0,
            overPar: 0,
          },
        };

    return NextResponse.json({
      success: true,
      stats,
      recentGames: recentGames || [],
    });
  } catch (error) {
    logger.error('[ElementSoup] Unexpected error in GET /api/element-soup/stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/element-soup/stats
 * Save game progress (not completion - for in-progress saves)
 * Body:
 * - puzzleDate: string
 * - puzzleNumber: number
 * - elementBank: string[]
 * - combinationPath: array
 * - elapsedTime: number
 */
export async function POST(request) {
  try {
    const supabase = createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { puzzleDate, puzzleNumber, elementBank, combinationPath, elapsedTime } = body;

    if (!puzzleDate || !puzzleNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: puzzleDate, puzzleNumber' },
        { status: 400 }
      );
    }

    // Check if already completed
    const { data: existing } = await supabase
      .from('element_soup_game_stats')
      .select('completed')
      .eq('user_id', user.id)
      .eq('puzzle_date', puzzleDate)
      .single();

    if (existing?.completed) {
      return NextResponse.json({
        success: true,
        message: 'Puzzle already completed, progress not saved',
      });
    }

    // Save progress
    const { error: saveError } = await supabase.from('element_soup_game_stats').upsert(
      {
        user_id: user.id,
        puzzle_date: puzzleDate,
        puzzle_number: puzzleNumber,
        completed: false,
        elements_discovered: elementBank?.length || 4,
        final_element_bank: elementBank || [],
        combination_path: combinationPath || [],
        time_taken: elapsedTime || 0,
      },
      {
        onConflict: 'user_id,puzzle_date',
      }
    );

    if (saveError) {
      logger.error('[ElementSoup] Failed to save progress', { error: saveError });
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[ElementSoup] Unexpected error in POST /api/element-soup/stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
