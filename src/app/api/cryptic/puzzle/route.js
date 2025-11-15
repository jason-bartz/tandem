import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import logger from '@/lib/logger';

/**
 * GET /api/cryptic/puzzle
 * Get today's cryptic puzzle or a specific date's puzzle
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
        .from('cryptic_puzzles')
        .select('id, date, clue, length, word_pattern, difficulty_rating');

      if (startDate) {
        query.gte('date', startDate);
      }
      if (endDate) {
        query.lte('date', endDate);
      }

      query.lte('date', new Date().toISOString().split('T')[0]);

      query.order('date', { ascending: false });

      if (limit) {
        query.limit(parseInt(limit, 10));
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('[API] Error fetching cryptic puzzles range', { error });
        return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        puzzles: data || [],
        total: count,
      });
    }

    // Get specific date or today's puzzle
    const targetDate = date || getCurrentPuzzleInfo().isoDate;

    logger.info('[API] Fetching cryptic puzzle', { date: targetDate });

    const { data, error } = await supabase
      .from('cryptic_puzzles')
      .select('*')
      .eq('date', targetDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No puzzle found
        logger.warn('[API] No cryptic puzzle found for date', { date: targetDate });
        return NextResponse.json({ error: 'No puzzle available for this date' }, { status: 404 });
      }

      logger.error('[API] Error fetching cryptic puzzle', { error });
      return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
    }

    // Don't return the answer to the client
    const { answer, ...puzzleWithoutAnswer } = data;

    logger.info('[API] Cryptic puzzle fetched successfully', {
      date: data.date,
      hasHints: !!data.hints,
      isMultiWord: data.word_pattern && data.word_pattern.length > 1,
    });

    return NextResponse.json({
      success: true,
      ...puzzleWithoutAnswer,
      // Include answer length and word pattern
      answerLength: answer.replace(/\s/g, '').length, // Total letters excluding spaces
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/cryptic/puzzle', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/cryptic/puzzle
 * Check user's answer for a cryptic puzzle
 * Body: { date, answer }
 */
export async function POST(request) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { date, answer: userAnswer } = body;

    if (!date || !userAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    logger.info('[API] Checking cryptic puzzle answer', { date });

    // Fetch the puzzle
    const { data, error } = await supabase
      .from('cryptic_puzzles')
      .select('answer, explanation')
      .eq('date', date)
      .single();

    if (error) {
      logger.error('[API] Error fetching puzzle for answer check', { error });
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    // Compare answers (case-insensitive, ignore spaces)
    const cleanUserAnswer = userAnswer.replace(/\s/g, '').toUpperCase();
    const cleanCorrectAnswer = data.answer.replace(/\s/g, '').toUpperCase();

    const isCorrect = cleanUserAnswer === cleanCorrectAnswer;

    logger.info('[API] Answer checked', { date, isCorrect });

    return NextResponse.json({
      success: true,
      correct: isCorrect,
      ...(isCorrect && { explanation: data.explanation, answer: data.answer }),
    });
  } catch (error) {
    logger.error('[API] Unexpected error in POST /api/cryptic/puzzle', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
