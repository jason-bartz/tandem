import { NextResponse } from 'next/server';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

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

    // Try up to 3 times to get a verified movie
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Generate a single movie using AI
        const aiResult = await aiService.generateSingleReelConnectionsMovie({
          connection: connection.trim(),
          difficulty,
          context: context?.trim() || '',
          existingMovies,
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
