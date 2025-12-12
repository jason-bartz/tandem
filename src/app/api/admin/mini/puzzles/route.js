import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getMiniPuzzleNumber } from '@/lib/miniUtils';
import logger from '@/lib/logger';

/**
 * GET /api/admin/mini/puzzles
 * Fetch all mini puzzles (admin only)
 * Optional query params:
 * - startDate: filter puzzles from this date onwards
 * - endDate: filter puzzles up to this date
 * - limit: number of puzzles to return
 */
export async function GET(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build query
    let query = supabase
      .from('mini_puzzles')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: puzzles, error } = await query;

    if (error) {
      logger.error('Error fetching mini puzzles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzles }, { status: 200 });
  } catch (error) {
    logger.error('Error in GET /api/admin/mini/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/mini/puzzles
 * Create a new mini crossword puzzle (admin only)
 * Body: { date, difficulty, grid, solution, clues }
 * Note: puzzle number is auto-calculated from date
 */
export async function POST(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    const body = await request.json();
    const { date, difficulty, grid, solution, clues } = body;

    // Validate required fields
    if (!date || !difficulty || !grid || !solution || !clues) {
      return NextResponse.json(
        { error: 'Missing required fields: date, difficulty, grid, solution, clues' },
        { status: 400 }
      );
    }

    // Auto-calculate puzzle number from date
    const number = getMiniPuzzleNumber(date);

    // Validate grid structure (5x5)
    if (
      !Array.isArray(grid) ||
      grid.length !== 5 ||
      !grid.every((row) => Array.isArray(row) && row.length === 5)
    ) {
      return NextResponse.json({ error: 'Grid must be a 5x5 array' }, { status: 400 });
    }

    // Validate solution structure (5x5)
    if (
      !Array.isArray(solution) ||
      solution.length !== 5 ||
      !solution.every((row) => Array.isArray(row) && row.length === 5)
    ) {
      return NextResponse.json({ error: 'Solution must be a 5x5 array' }, { status: 400 });
    }

    // Validate clues structure
    if (!clues.across || !clues.down) {
      return NextResponse.json(
        { error: 'Clues must have "across" and "down" arrays' },
        { status: 400 }
      );
    }

    // Convert all letters to uppercase in grid and solution
    const normalizedGrid = grid.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? cell.toUpperCase() : cell))
    );
    const normalizedSolution = solution.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? cell.toUpperCase() : cell))
    );

    // Insert puzzle
    const insertData = {
      date,
      number, // Auto-calculated from date
      difficulty,
      grid: normalizedGrid,
      solution: normalizedSolution,
      clues,
    };

    const { data: puzzle, error } = await supabase
      .from('mini_puzzles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating mini puzzle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzle }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/admin/mini/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/mini/puzzles
 * Update an existing mini puzzle (admin only)
 * Body: { id, ...fields to update }
 * Note: if date is updated, puzzle number will be auto-recalculated
 */
export async function PUT(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing puzzle id' }, { status: 400 });
    }

    // Normalize grid and solution if provided
    if (updateFields.grid) {
      updateFields.grid = updateFields.grid.map((row) =>
        row.map((cell) => (typeof cell === 'string' ? cell.toUpperCase() : cell))
      );
    }
    if (updateFields.solution) {
      updateFields.solution = updateFields.solution.map((row) =>
        row.map((cell) => (typeof cell === 'string' ? cell.toUpperCase() : cell))
      );
    }

    // Auto-calculate puzzle number if date is being updated
    if (updateFields.date) {
      updateFields.number = getMiniPuzzleNumber(updateFields.date);
    }

    // Remove number field if provided manually (we always auto-calculate)
    if (updateFields.number && !updateFields.date) {
      delete updateFields.number;
    }

    const { data: puzzle, error } = await supabase
      .from('mini_puzzles')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating mini puzzle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzle }, { status: 200 });
  } catch (error) {
    logger.error('Error in PUT /api/admin/mini/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/mini/puzzles
 * Delete a mini puzzle (admin only)
 * Query param: id
 */
export async function DELETE(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing puzzle id' }, { status: 400 });
    }

    // Delete puzzle
    const { error } = await supabase.from('mini_puzzles').delete().eq('id', id);

    if (error) {
      logger.error('Error deleting mini puzzle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error in DELETE /api/admin/mini/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
