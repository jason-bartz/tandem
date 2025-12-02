/**
 * OMDb API utility for fetching movie data
 * Server-side only - API key is kept secure
 */

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';
const POSTER_BASE_URL = 'http://img.omdbapi.com/';

/**
 * Fetch movie details by IMDb ID
 * @param {string} imdbId - IMDb ID (e.g., 'tt1375666')
 * @returns {Promise<object>} Movie data
 */
export async function getMovieById(imdbId) {
  if (!OMDB_API_KEY) {
    throw new Error('OMDb API key not configured');
  }

  try {
    const response = await fetch(`${OMDB_BASE_URL}?i=${imdbId}&apikey=${OMDB_API_KEY}`);

    if (!response.ok) {
      throw new Error(`OMDb API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Response === 'False') {
      throw new Error(data.Error || 'Movie not found');
    }

    return {
      imdbId: data.imdbID,
      title: data.Title,
      year: data.Year,
      poster: data.Poster,
      plot: data.Plot,
      director: data.Director,
      actors: data.Actors,
      genre: data.Genre,
      rating: data.imdbRating,
    };
  } catch (error) {
    console.error(`Error fetching movie ${imdbId}:`, error);
    throw error;
  }
}

/**
 * Get poster URL for a movie
 * @param {string} imdbId - IMDb ID
 * @param {number} height - Poster height (default: 600)
 * @returns {string} Poster URL
 */
export function getPosterUrl(imdbId, height = 600) {
  if (!OMDB_API_KEY) {
    return null;
  }
  return `${POSTER_BASE_URL}?i=${imdbId}&h=${height}&apikey=${OMDB_API_KEY}`;
}

/**
 * Fetch multiple movies by IMDb IDs
 * @param {string[]} imdbIds - Array of IMDb IDs
 * @returns {Promise<object[]>} Array of movie data
 */
export async function getMoviesByIds(imdbIds) {
  const promises = imdbIds.map((id) => getMovieById(id));
  return Promise.all(promises);
}
