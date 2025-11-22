import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentMiniPuzzleInfo, isPuzzleComplete } from '@/lib/miniUtils';
import logger from '@/lib/logger';

/**
 * GET /api/mini/puzzle
 * Get today's mini puzzle or a specific date's puzzle
 * Query params:
 * - date: ISO date string (YYYY-MM-DD) - optional
 * - startDate: ISO date string for range query - optional
 * - endDate: ISO date string for range query - optional
 * - limit: number of puzzles to return - optional
 */
export async function GET(request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    // If requesting a range of puzzles (for archive)
    if (startDate || endDate || limit) {
      const query = supabase
        .from('mini_puzzles')
        .select('id, date, number');

      if (startDate) {
        query.gte('date', startDate);
      }
      if (endDate) {
        query.lte('date', endDate);
      }

      // Don't return future puzzles
      query.lte('date', new Date().toISOString().split('T')[0]);

      query.order('date', { ascending: false });

      if (limit) {
        query.limit(parseInt(limit, 10));
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('[API] Error fetching mini puzzles range', { error });
        return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        puzzles: data || [],
        total: count,
      });
    }

    // Get specific date or today's puzzle
    const targetDate = date || getCurrentMiniPuzzleInfo().isoDate;

    logger.info('[API] Fetching mini puzzle', { date: targetDate });

    const { data, error } = await supabase
      .from('mini_puzzles')
      .select('*')
      .eq('date', targetDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No puzzle found
        logger.warn('[API] No mini puzzle found for date', { date: targetDate });
        return NextResponse.json({ error: 'No puzzle available for this date' }, { status: 404 });
      }

      logger.error('[API] Error fetching mini puzzle', { error });
      return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
    }

    // Don't return the solution to the client (they need to solve it!)
    // eslint-disable-next-line no-unused-vars
    const { solution, ...puzzleWithoutSolution} = data;

    logger.info('[API] Mini puzzle fetched successfully', {
      date: data.date,
      number: data.number,
      hasClues: !!data.clues,
    });

    return NextResponse.json({
      success: true,
      ...puzzleWithoutSolution,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/mini/puzzle', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/mini/puzzle
 * Validate a user's solution
 * Body:
 * - date: ISO date string
 * - grid: User's completed grid (5x5 array)
 */
export async function POST(request) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { date, grid } = body;

    if (!date || !grid) {
      return NextResponse.json(
        { error: 'Missing required fields: date, grid' },
        { status: 400 }
      );
    }

    logger.info('[API] Validating mini puzzle solution', { date });

    // Fetch the puzzle with solution
    const { data, error } = await supabase
      .from('mini_puzzles')
      .select('grid, solution')
      .eq('date', date)
      .single();

    if (error) {
      logger.error('[API] Error fetching puzzle for validation', { error });
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    // Use solution if available, otherwise use grid
    const solutionGrid = data.solution || data.grid;

    // Validate the user's grid against the solution
    const isCorrect = isPuzzleComplete(grid, solutionGrid);

    logger.info('[API] Puzzle validation complete', { date, isCorrect });

    return NextResponse.json({
      success: true,
      correct: isCorrect,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in POST /api/mini/puzzle', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
