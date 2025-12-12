import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * Movie search API for Reel Connections admin
 * Searches OMDb API for movies by title, actor, director, year, etc.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query too short' }, { status: 400 });
    }

    if (!OMDB_API_KEY) {
      return NextResponse.json({ error: 'OMDb API key not configured' }, { status: 500 });
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
