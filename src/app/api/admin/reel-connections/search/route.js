import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * Movie search API for Reel Connections admin
 * Searches OMDb API for movies by title, actor, director, year, etc.
 * Supports pagination via ?page=N (OMDb returns 10 results per page)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json({ error: 'OMDb API key not configured' }, { status: 500 });
    }

    // Smart search: Check if query ends with a year (e.g., "The Matrix 1999")
    const yearMatch = query.match(/(.+?)\s+(\d{4})$/);
    const searchTitle = yearMatch ? yearMatch[1] : query;
    const searchYear = yearMatch ? yearMatch[2] : null;

    // OMDb search (&s=) requires 3+ characters. For shorter queries, use title lookup (&t=)
    let movies = [];
    let totalResults = 0;

    if (searchTitle.trim().length >= 3) {
      // Standard search mode - supports pagination
      let searchUrl = `${OMDB_BASE_URL}?s=${encodeURIComponent(searchTitle)}&type=movie&page=${page}&apikey=${OMDB_API_KEY}`;
      if (searchYear) {
        searchUrl += `&y=${searchYear}`;
      }

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`OMDb API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.Response !== 'False' && data.Search) {
        movies = data.Search.map((movie) => ({
          imdbId: movie.imdbID,
          title: movie.Title,
          year: movie.Year,
          poster: movie.Poster !== 'N/A' ? movie.Poster : '/ui/games/movie.png',
        }));
        totalResults = parseInt(data.totalResults || '0', 10);
      }
    } else {
      // Short query (1-2 chars) - use title lookup which is more lenient
      let lookupUrl = `${OMDB_BASE_URL}?t=${encodeURIComponent(searchTitle)}&type=movie&apikey=${OMDB_API_KEY}`;
      if (searchYear) {
        lookupUrl += `&y=${searchYear}`;
      }

      const response = await fetch(lookupUrl);
      if (!response.ok) {
        throw new Error(`OMDb API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.Response !== 'False' && data.Title) {
        movies = [
          {
            imdbId: data.imdbID,
            title: data.Title,
            year: data.Year,
            poster: data.Poster !== 'N/A' ? data.Poster : '/ui/games/movie.png',
          },
        ];
        totalResults = 1;
      }
    }

    return NextResponse.json({
      movies,
      totalResults,
      page,
      totalPages: Math.ceil(totalResults / 10),
    });
  } catch (error) {
    logger.error('Movie search error:', error);
    return NextResponse.json({ error: 'Failed to search movies' }, { status: 500 });
  }
}
