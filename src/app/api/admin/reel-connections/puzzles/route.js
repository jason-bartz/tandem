import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET - Fetch Reel Connections puzzles
 */
export async function GET(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '365');
    const date = searchParams.get('date');

    let query = supabase
      .from('reel_connections_puzzles')
      .select(
        `
        *,
        groups:reel_connections_groups(
          *,
          movies:reel_connections_movies(*)
        )
      `
      )
      .order('date', { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq('date', date);
    }

    const { data: puzzles, error } = await query;

    if (error) throw error;

    // Sort groups and movies by order
    const formattedPuzzles = puzzles.map((puzzle) => ({
      ...puzzle,
      groups: puzzle.groups
        .sort((a, b) => a.order - b.order)
        .map((group) => ({
          ...group,
          movies: group.movies.sort((a, b) => a.order - b.order),
        })),
    }));

    return NextResponse.json({ puzzles: formattedPuzzles });
  } catch (error) {
    console.error('Error fetching puzzles:', error);
    return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 });
  }
}

/**
 * POST - Create new Reel Connections puzzle
 */
export async function POST(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, groups, creatorName, isUserSubmitted } = body;

    if (!date || !groups || groups.length !== 4) {
      return NextResponse.json({ error: 'Invalid puzzle data' }, { status: 400 });
    }

    // Create puzzle with optional creator attribution
    const puzzleData = { date };
    if (isUserSubmitted) {
      puzzleData.creator_name = creatorName;
      puzzleData.is_user_submitted = true;
    }

    const { data: puzzle, error: puzzleError } = await supabase
      .from('reel_connections_puzzles')
      .insert(puzzleData)
      .select()
      .single();

    if (puzzleError) throw puzzleError;

    // Create groups and movies
    for (const group of groups) {
      const { data: createdGroup, error: groupError } = await supabase
        .from('reel_connections_groups')
        .insert({
          puzzle_id: puzzle.id,
          connection: group.connection,
          difficulty: group.difficulty,
          order: group.order,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Create movies for this group
      const movieInserts = group.movies.map((movie) => ({
        group_id: createdGroup.id,
        imdb_id: movie.imdbId,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        order: movie.order,
      }));

      const { error: moviesError } = await supabase
        .from('reel_connections_movies')
        .insert(movieInserts);

      if (moviesError) throw moviesError;
    }

    return NextResponse.json({ success: true, puzzle });
  } catch (error) {
    console.error('Error creating puzzle:', error);
    return NextResponse.json({ error: 'Failed to create puzzle' }, { status: 500 });
  }
}

/**
 * PUT - Update existing Reel Connections puzzle
 */
export async function PUT(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, date, groups } = body;

    if (!id || !date || !groups || groups.length !== 4) {
      return NextResponse.json({ error: 'Invalid puzzle data' }, { status: 400 });
    }

    // Update puzzle date
    const { error: puzzleError } = await supabase
      .from('reel_connections_puzzles')
      .update({ date, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (puzzleError) throw puzzleError;

    // Delete existing groups and movies (cascade will handle movies)
    await supabase.from('reel_connections_groups').delete().eq('puzzle_id', id);

    // Recreate groups and movies
    for (const group of groups) {
      const { data: createdGroup, error: groupError } = await supabase
        .from('reel_connections_groups')
        .insert({
          puzzle_id: id,
          connection: group.connection,
          difficulty: group.difficulty,
          order: group.order,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const movieInserts = group.movies.map((movie) => ({
        group_id: createdGroup.id,
        imdb_id: movie.imdbId,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        order: movie.order,
      }));

      const { error: moviesError } = await supabase
        .from('reel_connections_movies')
        .insert(movieInserts);

      if (moviesError) throw moviesError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating puzzle:', error);
    return NextResponse.json({ error: 'Failed to update puzzle' }, { status: 500 });
  }
}

/**
 * DELETE - Delete Reel Connections puzzle
 */
export async function DELETE(request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Puzzle ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('reel_connections_puzzles').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting puzzle:', error);
    return NextResponse.json({ error: 'Failed to delete puzzle' }, { status: 500 });
  }
}
