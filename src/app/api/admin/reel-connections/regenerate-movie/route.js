import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Single Movie Regeneration API for Reel Connections
 * Generates 1 replacement movie based on a connection, verifies against OMDb
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { connection, difficulty = 'medium', context = '', existingMovies = [] } = body;

    if (!connection || connection.trim().length < 3) {
      return NextResponse.json(
        { error: 'Connection must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json({ error: 'OMDb API key not configured' }, { status: 500 });
    }

    // Fetch overused movies from past puzzles
    let overusedMovies = [];
    try {
      const { data } = await supabase.from('reel_connections_movies').select('title');
      if (data) {
        const counts = {};
        for (const row of data) {
          if (row.title) counts[row.title] = (counts[row.title] || 0) + 1;
        }
        overusedMovies = Object.entries(counts)
          .filter(([, c]) => c >= 2)
          .map(([title]) => title);
      }
    } catch (err) {
      logger.warn('[ReelRegenerate] Failed to fetch past movies:', err.message);
    }

    // Try up to 5 times to get a verified, non-duplicate movie
    const maxAttempts = 5;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Generate a single movie using AI
        const aiResult = await aiService.generateSingleReelConnectionsMovie({
          connection: connection.trim(),
          difficulty,
          context: context?.trim() || '',
          existingMovies,
          overusedMovies,
        });

        const movieTitle = aiResult.movie;

        // Search OMDb for the movie
        const searchResponse = await fetch(
          `${OMDB_BASE_URL}?s=${encodeURIComponent(movieTitle)}&type=movie&apikey=${OMDB_API_KEY}`
        );

        if (!searchResponse.ok) {
          throw new Error(`OMDb API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();

        if (
          searchData.Response === 'False' ||
          !searchData.Search ||
          searchData.Search.length === 0
        ) {
          logger.warn(`Movie "${movieTitle}" not found in OMDb, trying again...`);
          lastError = new Error(`Movie "${movieTitle}" not found in OMDb`);
          continue;
        }

        // Get the first result (best match)
        const movie = searchData.Search[0];

        // Check if this movie is already in the existing list (case-insensitive)
        const existingLower = existingMovies.map((m) => m.toLowerCase());
        if (existingLower.includes(movie.Title.toLowerCase())) {
          logger.warn(`Movie "${movie.Title}" is a duplicate of existing movie, trying again...`);
          lastError = new Error(`Movie "${movie.Title}" is a duplicate`);
          continue;
        }

        // Verify poster exists
        if (!movie.Poster || movie.Poster === 'N/A') {
          logger.warn(`Movie "${movieTitle}" has no poster, trying again...`);
          lastError = new Error(`Movie "${movieTitle}" has no poster`);
          continue;
        }

        // Return verified movie
        return NextResponse.json({
          movie: {
            imdbId: movie.imdbID,
            title: movie.Title,
            year: movie.Year,
            poster: movie.Poster,
          },
        });
      } catch (error) {
        logger.error(`Single movie generation attempt ${attempt + 1} failed:`, error);
        lastError = error;
      }
    }

    return NextResponse.json(
      {
        error: 'Could not generate a verified movie',
        details: lastError?.message || 'Please try again',
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Single movie regeneration error:', error);

    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'AI service rate limit reached. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('authentication') || error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service authentication error. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to regenerate movie' },
      { status: 500 }
    );
  }
}
