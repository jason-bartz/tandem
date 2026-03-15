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
 * Fetch all movies used in past puzzles (title list)
 */
async function fetchPastMovies() {
  try {
    const { data, error } = await supabase.from('reel_connections_movies').select('title');

    if (error) {
      logger.warn('[ReelGenerate] Failed to fetch past movies:', error.message);
      return [];
    }

    // Count occurrences and return movies used 2+ times as high-priority avoids
    const counts = {};
    for (const row of data || []) {
      if (row.title) {
        const t = row.title;
        counts[t] = (counts[t] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([title, count]) => ({ title, count }));
  } catch (err) {
    logger.warn('[ReelGenerate] Error fetching past movies:', err.message);
    return [];
  }
}

/**
 * AI Movie Generation API for Reel Connections
 * Generates 4 movies based on a connection, verifies them against OMDb
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { connection, difficulty = 'medium', context = '' } = body;

    if (!connection || connection.trim().length < 3) {
      return NextResponse.json(
        { error: 'Connection must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json({ error: 'OMDb API key not configured' }, { status: 500 });
    }

    // Fetch previously used movies to avoid repeats
    const pastMovies = await fetchPastMovies();
    const overusedMovies = pastMovies.filter((m) => m.count >= 2).map((m) => m.title);
    const allPastTitles = pastMovies.map((m) => m.title);

    logger.info('[ReelGenerate] Past movie context', {
      totalUnique: allPastTitles.length,
      overused: overusedMovies.length,
    });

    // Generate movies using AI
    const aiResult = await aiService.generateReelConnectionsMovies({
      connection: connection.trim(),
      difficulty,
      context: context?.trim() || '',
      overusedMovies,
      allPastMovies: allPastTitles,
    });

    // Verify each movie against OMDb and get full details
    const verifiedMovies = [];
    const failedMovies = [];

    for (const movieTitle of aiResult.movies) {
      try {
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
          failedMovies.push({ title: movieTitle, reason: 'Not found in OMDb' });
          continue;
        }

        // Get the first result (best match)
        const movie = searchData.Search[0];

        // Verify poster exists
        if (!movie.Poster || movie.Poster === 'N/A') {
          failedMovies.push({ title: movieTitle, reason: 'No poster available' });
          continue;
        }

        // Add verified movie
        verifiedMovies.push({
          imdbId: movie.imdbID,
          title: movie.Title,
          year: movie.Year,
          poster: movie.Poster,
        });
      } catch (error) {
        logger.error(`Error verifying movie "${movieTitle}":`, error);
        failedMovies.push({ title: movieTitle, reason: error.message });
      }
    }

    // Check if we have enough verified movies
    if (verifiedMovies.length < 4) {
      // If we have some failures, try to regenerate just those movies
      if (failedMovies.length > 0 && verifiedMovies.length > 0) {
        return NextResponse.json(
          {
            error: 'Some movies could not be verified',
            details: `${verifiedMovies.length}/4 movies verified. Failed: ${failedMovies.map((f) => f.title).join(', ')}`,
            verifiedMovies,
            failedMovies,
            suggestion: 'Try regenerating or manually search for alternatives',
          },
          { status: 206 } // Partial Content
        );
      }

      return NextResponse.json(
        {
          error: 'Could not verify enough movies',
          details: `Only ${verifiedMovies.length}/4 movies could be verified with posters`,
          failedMovies,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      connection: aiResult.connection,
      movies: verifiedMovies,
    });
  } catch (error) {
    logger.error('AI generation error:', error);

    // Handle specific AI errors
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
      { error: error.message || 'Failed to generate movies' },
      { status: 500 }
    );
  }
}
