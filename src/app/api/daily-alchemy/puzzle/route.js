import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

/**
 * Get today's date in YYYY-MM-DD format based on ET timezone
 * (Puzzles reset at midnight Eastern Time)
 */
function getCurrentPuzzleDate() {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/element-soup/puzzle
 * Get today's puzzle or a specific date's puzzle
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
        .from('element_soup_puzzles')
        .select('id, date, puzzle_number, target_element, target_emoji, par_moves')
        .eq('published', true);

      if (startDate) {
        query.gte('date', startDate);
      }
      if (endDate) {
        query.lte('date', endDate);
      }

      // Don't return future puzzles
      const today = getCurrentPuzzleDate();
      query.lte('date', today);

      query.order('date', { ascending: false });

      if (limit) {
        query.limit(parseInt(limit, 10));
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('[API] Error fetching element soup puzzles range', { error });
        return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        puzzles: data || [],
        total: count,
      });
    }

    // Get specific date or today's puzzle
    const targetDate = date || getCurrentPuzzleDate();

    logger.info('[API] Fetching element soup puzzle', { date: targetDate });

    const { data, error } = await supabase
      .from('element_soup_puzzles')
      .select(
        'id, puzzle_number, date, target_element, target_emoji, par_moves, difficulty, solution_path'
      )
      .eq('date', targetDate)
      .eq('published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No puzzle found
        logger.warn('[API] No element soup puzzle found for date', { date: targetDate });
        return NextResponse.json(
          {
            error:
              "It looks like our Puzzlemaster is still sleeping. Come back shortly for today's puzzle!",
          },
          { status: 404 }
        );
      }

      logger.error('[API] Error fetching element soup puzzle', { error });
      return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
    }

    logger.info('[API] Element soup puzzle fetched successfully', {
      date: data.date,
      number: data.puzzle_number,
      target: data.target_element,
    });

    return NextResponse.json({
      success: true,
      puzzle: {
        id: data.id,
        number: data.puzzle_number,
        date: data.date,
        targetElement: data.target_element,
        targetEmoji: data.target_emoji,
        parMoves: data.par_moves,
        difficulty: data.difficulty,
        solutionPath: data.solution_path || [],
      },
      starterElements: STARTER_ELEMENTS,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/element-soup/puzzle', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
