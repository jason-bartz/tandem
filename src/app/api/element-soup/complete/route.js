import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * POST /api/element-soup/complete
 * Submit game completion and save stats
 * Body:
 * - puzzleDate: string - The puzzle date (YYYY-MM-DD)
 * - puzzleNumber: number - The puzzle number
 * - timeTaken: number - Time in seconds
 * - movesCount: number - Number of combinations made
 * - parMoves: number - Par value for the puzzle
 * - elementBank: string[] - List of element names discovered
 * - combinationPath: array - Array of {elementA, elementB, result} objects
 * - newDiscoveries: number - Number of new elements discovered this game
 * - firstDiscoveries: number - Number of first-ever discoveries
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
    const {
      puzzleDate,
      puzzleNumber,
      timeTaken,
      movesCount,
      parMoves,
      elementBank = [],
      combinationPath = [],
      newDiscoveries = 0,
      firstDiscoveries = 0,
    } = body;

    // Validate required fields
    if (!puzzleDate || !puzzleNumber || timeTaken === undefined || movesCount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: puzzleDate, puzzleNumber, timeTaken, movesCount' },
        { status: 400 }
      );
    }

    logger.info('[ElementSoup] Recording game completion', {
      userId: user.id,
      puzzleDate,
      puzzleNumber,
      timeTaken,
      movesCount,
      parMoves,
    });

    // Check if this puzzle was already completed
    const { data: existingGame } = await supabase
      .from('element_soup_game_stats')
      .select('id, completed')
      .eq('user_id', user.id)
      .eq('puzzle_date', puzzleDate)
      .single();

    if (existingGame?.completed) {
      logger.info('[ElementSoup] Puzzle already completed', { userId: user.id, puzzleDate });
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'This puzzle was already completed',
      });
    }

    // Save or update game stats
    const gameStats = {
      user_id: user.id,
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      completed: true,
      time_taken: timeTaken,
      moves_count: movesCount,
      par_moves: parMoves,
      elements_discovered: elementBank.length,
      new_discoveries: newDiscoveries,
      first_discoveries: firstDiscoveries,
      final_element_bank: elementBank,
      combination_path: combinationPath,
      completed_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase.from('element_soup_game_stats').upsert(gameStats, {
      onConflict: 'user_id,puzzle_date',
    });

    if (saveError) {
      logger.error('[ElementSoup] Failed to save game stats', { error: saveError });
      return NextResponse.json({ error: 'Failed to save game stats' }, { status: 500 });
    }

    // Update aggregate stats using the database function
    const { error: aggregateError } = await supabase.rpc('update_soup_aggregate_stats', {
      p_user_id: user.id,
    });

    if (aggregateError) {
      logger.error('[ElementSoup] Failed to update aggregate stats', { error: aggregateError });
      // Don't fail the request, just log the error
    }

    // Calculate rank for response (optional - can be expensive)
    let rank = null;
    try {
      const { count } = await supabase
        .from('element_soup_game_stats')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', puzzleDate)
        .eq('completed', true)
        .lt('time_taken', timeTaken);

      rank = (count || 0) + 1;
    } catch (rankError) {
      logger.warn('[ElementSoup] Failed to calculate rank', { error: rankError });
    }

    // Get updated user stats
    const { data: userStats } = await supabase
      .from('element_soup_user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    logger.info('[ElementSoup] Game completion recorded', {
      userId: user.id,
      puzzleDate,
      timeTaken,
      movesCount,
      rank,
    });

    // Calculate par comparison
    const parDiff = movesCount - parMoves;
    const parComparison = parDiff === 0 ? '0' : parDiff > 0 ? `+${parDiff}` : `${parDiff}`;

    return NextResponse.json({
      success: true,
      stats: {
        parComparison,
        rank,
        currentStreak: userStats?.current_streak || 0,
        longestStreak: userStats?.longest_streak || 0,
        totalCompleted: userStats?.total_completed || 1,
        totalFirstDiscoveries: userStats?.first_discoveries || 0,
      },
    });
  } catch (error) {
    logger.error('[ElementSoup] Unexpected error in POST /api/element-soup/complete', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
