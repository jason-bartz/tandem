import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET - Fetch today's Reel Connections puzzle
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data: puzzles, error } = await supabase
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
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No puzzle found for this date
        return NextResponse.json({ puzzle: null });
      }
      throw error;
    }

    // Sort groups by order and movies by order
    const formattedPuzzle = {
      ...puzzles,
      groups: puzzles.groups
        .sort((a, b) => a.order - b.order)
        .map((group) => ({
          id: group.id,
          connection: group.connection,
          difficulty: group.difficulty,
          // Map difficulty to colors
          color: {
            easiest: 'bg-[#ffce00]',
            easy: 'bg-[#7ed957]',
            medium: 'bg-[#39b6ff]',
            hardest: 'bg-[#cb6ce6]',
          }[group.difficulty],
          textColor: 'text-[#2c2c2c]',
          movies: group.movies
            .sort((a, b) => a.order - b.order)
            .map((movie) => ({
              imdbId: movie.imdb_id,
              title: movie.title,
              year: movie.year,
              poster: movie.poster,
            })),
        })),
    };

    return NextResponse.json({ puzzle: formattedPuzzle });
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    return NextResponse.json({ error: 'Failed to fetch puzzle' }, { status: 500 });
  }
}
