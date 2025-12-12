import { NextResponse } from 'next/server';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * AI Movie Generation API for Reel Connections
 * Generates 4 movies based on a connection, verifies them against OMDb
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { connection, difficulty = 'medium' } = body;

    if (!connection || connection.trim().length < 3) {
      return NextResponse.json(
        { error: 'Connection must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json({ error: 'OMDb API key not configured' }, { status: 500 });
    }

    // Generate movies using AI
    const aiResult = await aiService.generateReelConnectionsMovies({
      connection: connection.trim(),
      difficulty,
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
