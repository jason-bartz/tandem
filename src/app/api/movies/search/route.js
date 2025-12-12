import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/verify';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * Movie search API for puzzle submissions
 * Searches OMDb API for movies by title
 * Requires authentication (subscription check is done client-side via IAP on iOS)
 * The create-puzzle page gates access, so this endpoint just needs auth to prevent abuse
 */
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Require authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (!user) {
      return authResponse;
    }

    // Note: Subscription check removed - iOS IAP subscriptions may not be in database
    // The create-puzzle page already enforces subscription access via SubscriptionContext
    // Rate limiting + auth is sufficient protection for movie search

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json({ error: 'Movie search not configured' }, { status: 500 });
    }

    // Smart search: Check if query ends with a year (e.g., "The Matrix 1999")
    let searchUrl = `${OMDB_BASE_URL}?s=${encodeURIComponent(query)}&type=movie&apikey=${OMDB_API_KEY}`;

    const yearMatch = query.match(/(.+?)\s+(\d{4})$/);
    if (yearMatch) {
      const title = yearMatch[1];
      const year = yearMatch[2];
      searchUrl = `${OMDB_BASE_URL}?s=${encodeURIComponent(title)}&y=${year}&type=movie&apikey=${OMDB_API_KEY}`;
    }

    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`OMDb API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Response === 'False') {
      return NextResponse.json({ movies: [] });
    }

    // Format results
    const movies = (data.Search || []).map((movie) => ({
      imdbId: movie.imdbID,
      title: movie.Title,
      year: movie.Year,
      poster: movie.Poster !== 'N/A' ? movie.Poster : '/icons/ui/movie.png',
    }));

    return NextResponse.json({ movies });
  } catch (error) {
    logger.error('Movie search error:', error);
    return NextResponse.json({ error: 'Failed to search movies' }, { status: 500 });
  }
}
