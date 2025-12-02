/**
 * Sample puzzle data for Reel Connections
 * Each puzzle has 4 groups of 4 movies
 */

export const samplePuzzles = [
  {
    id: 1,
    date: '2025-11-28',
    difficulty: 'medium',
    groups: [
      {
        id: 1,
        connection: 'Directed by Christopher Nolan',
        difficulty: 'easy',
        color: 'yellow',
        movies: [
          { imdbId: 'tt1375666', title: 'Inception', year: '2010' },
          { imdbId: 'tt0468569', title: 'The Dark Knight', year: '2008' },
          { imdbId: 'tt0816692', title: 'Interstellar', year: '2014' },
          { imdbId: 'tt5013056', title: 'Dunkirk', year: '2017' },
        ],
      },
      {
        id: 2,
        connection: 'Marvel Cinematic Universe',
        difficulty: 'easy',
        color: 'green',
        movies: [
          { imdbId: 'tt0848228', title: 'The Avengers', year: '2012' },
          { imdbId: 'tt1843866', title: 'Captain America: The Winter Soldier', year: '2014' },
          { imdbId: 'tt3498820', title: 'Captain America: Civil War', year: '2016' },
          { imdbId: 'tt4154756', title: 'Avengers: Infinity War', year: '2018' },
        ],
      },
      {
        id: 3,
        connection: 'Won Best Picture Oscar',
        difficulty: 'medium',
        color: 'blue',
        movies: [
          { imdbId: 'tt1853728', title: 'Django Unchained', year: '2012' },
          { imdbId: 'tt0111161', title: 'The Shawshank Redemption', year: '1994' },
          { imdbId: 'tt0068646', title: 'The Godfather', year: '1972' },
          {
            imdbId: 'tt0167260',
            title: 'The Lord of the Rings: The Return of the King',
            year: '2003',
          },
        ],
      },
      {
        id: 4,
        connection: 'Features Time Travel',
        difficulty: 'hard',
        color: 'purple',
        movies: [
          { imdbId: 'tt0088763', title: 'Back to the Future', year: '1985' },
          { imdbId: 'tt0481499', title: 'Looper', year: '2012' },
          { imdbId: 'tt1285016', title: 'The Social Network', year: '2010' },
          { imdbId: 'tt0133093', title: 'The Matrix', year: '1999' },
        ],
      },
    ],
  },
];

/**
 * Get puzzle for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {object|null} Puzzle object or null if not found
 */
export function getPuzzleByDate(date) {
  return samplePuzzles.find((puzzle) => puzzle.date === date) || samplePuzzles[0];
}

/**
 * Get today's puzzle
 * @returns {object} Today's puzzle
 */
export function getTodaysPuzzle() {
  const today = new Date().toISOString().split('T')[0];
  return getPuzzleByDate(today);
}
