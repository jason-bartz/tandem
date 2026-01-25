'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/auth';
import logger from '@/lib/logger';

/**
 * Helper to verify admin authentication
 */
function checkAdminAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !verifyAdminToken(authHeader.replace('Bearer ', ''))) {
    return false;
  }
  return true;
}

/**
 * Calculate puzzle number from date
 * Element Soup puzzle #1 starts on 2026-01-23
 */
function calculatePuzzleNumber(date) {
  const startDate = new Date('2026-01-23T00:00:00Z');
  const targetDate = new Date(date + 'T00:00:00Z');
  const diffTime = targetDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * GET /api/admin/element-soup/puzzles
 * Get puzzles for admin panel
 */
export async function GET(request) {
  try {
    // Verify admin authentication
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // If requesting a single puzzle by date
    if (date) {
      const { data, error } = await supabase
        .from('element_soup_puzzles')
        .select('*')
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[Admin] Error fetching soup puzzle', { error });
        return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
      }

      return NextResponse.json({ success: true, puzzle: data || null });
    }

    // Get puzzles in date range
    let query = supabase
      .from('element_soup_puzzles')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[Admin] Error fetching soup puzzles', { error });
      return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
    }

    return NextResponse.json({ success: true, puzzles: data || [] });
  } catch (error) {
    logger.error('[Admin] Unexpected error in GET /api/admin/element-soup/puzzles', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/element-soup/puzzles
 * Create a new Element Soup puzzle
 */
export async function POST(request) {
  try {
    // Verify admin authentication
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, targetElement, targetEmoji, parMoves, solutionPath, difficulty, published } =
      body;

    // Validate required fields
    if (!date || !targetElement || !parMoves) {
      return NextResponse.json(
        { error: 'Missing required fields: date, targetElement, parMoves' },
        { status: 400 }
      );
    }

    // Calculate puzzle number
    const puzzleNumber = calculatePuzzleNumber(date);

    const supabase = createServerClient();

    // Check if puzzle already exists for this date
    const { data: existing } = await supabase
      .from('element_soup_puzzles')
      .select('id')
      .eq('date', date)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A puzzle already exists for this date. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Insert the puzzle
    const { data, error } = await supabase
      .from('element_soup_puzzles')
      .insert({
        puzzle_number: puzzleNumber,
        date,
        target_element: targetElement,
        target_emoji: targetEmoji || '✨',
        par_moves: parMoves,
        solution_path: solutionPath || [],
        difficulty: difficulty || 'medium',
        published: published !== false, // Default to true
      })
      .select()
      .single();

    if (error) {
      logger.error('[Admin] Error creating soup puzzle', { error });
      return NextResponse.json({ error: 'Failed to create puzzle' }, { status: 500 });
    }

    logger.info('[Admin] Element Soup puzzle created', {
      date,
      number: puzzleNumber,
      target: targetElement,
    });

    return NextResponse.json({ success: true, puzzle: data });
  } catch (error) {
    logger.error('[Admin] Unexpected error in POST /api/admin/element-soup/puzzles', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/element-soup/puzzles
 * Update an existing Element Soup puzzle
 */
export async function PUT(request) {
  try {
    // Verify admin authentication
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, date, targetElement, targetEmoji, parMoves, solutionPath, difficulty, published } =
      body;

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Build update object with only provided fields
    const updates = {};
    if (date) {
      updates.date = date;
      updates.puzzle_number = calculatePuzzleNumber(date);
    }
    if (targetElement !== undefined) updates.target_element = targetElement;
    if (targetEmoji !== undefined) updates.target_emoji = targetEmoji;
    if (parMoves !== undefined) updates.par_moves = parMoves;
    if (solutionPath !== undefined) updates.solution_path = solutionPath;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (published !== undefined) updates.published = published;

    const { data, error } = await supabase
      .from('element_soup_puzzles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('[Admin] Error updating soup puzzle', { error });
      return NextResponse.json({ error: 'Failed to update puzzle' }, { status: 500 });
    }

    logger.info('[Admin] Element Soup puzzle updated', { id, date: data.date });

    return NextResponse.json({ success: true, puzzle: data });
  } catch (error) {
    logger.error('[Admin] Unexpected error in PUT /api/admin/element-soup/puzzles', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/element-soup/puzzles
 * Delete an Element Soup puzzle
 */
export async function DELETE(request) {
  try {
    // Verify admin authentication
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from('element_soup_puzzles').delete().eq('id', id);

    if (error) {
      logger.error('[Admin] Error deleting soup puzzle', { error });
      return NextResponse.json({ error: 'Failed to delete puzzle' }, { status: 500 });
    }

    logger.info('[Admin] Element Soup puzzle deleted', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Admin] Unexpected error in DELETE /api/admin/element-soup/puzzles', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
