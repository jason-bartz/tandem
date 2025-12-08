'use client';

import { useState, useEffect, useRef } from 'react';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';

const DIFFICULTY_LEVELS = [
  {
    id: 'easiest',
    label: 'Easiest',
    color: 'bg-yellow-300',
    textColor: 'text-[#2c2c2c]',
    description: 'Very well-known, popular movies',
    placeholder: 'e.g., Movies directed by Steven Spielberg',
    order: 1,
  },
  {
    id: 'easy',
    label: 'Easy',
    color: 'bg-blue-400',
    textColor: 'text-[#2c2c2c]',
    description: 'Popular, widely recognized movies',
    placeholder: "e.g., 80's action thrillers",
    order: 2,
  },
  {
    id: 'medium',
    label: 'Medium',
    color: 'bg-purple-400',
    textColor: 'text-[#2c2c2c]',
    description: 'Mix of popular and moderately known',
    placeholder: 'e.g., Academy Awards Best Actor winners',
    order: 3,
  },
  {
    id: 'hardest',
    label: 'Hardest',
    color: 'bg-red-500',
    textColor: 'text-white',
    description: 'Can include lesser-known films',
    placeholder: 'e.g., Movies based on a Tom Clancy book',
    order: 4,
  },
];

/**
 * MovieSearchInput - Searchable input for selecting movies
 */
function MovieSearchInput({ value, onChange, groupColor }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await capacitorFetch(
          getApiUrl(`/api/movies/search?q=${encodeURIComponent(query)}`)
        );
        const data = await response.json();
        setResults(data.movies || []);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (movie) => {
    onChange(movie);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleRemove = () => {
    onChange(null);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div
          className={`${groupColor} border-[3px] border-black dark:border-white rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]`}
        >
          <div className="flex items-center gap-3">
            <div className="w-16 h-24 rounded-lg overflow-hidden border-2 border-black flex-shrink-0">
              <img src={value.poster} alt={value.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#2c2c2c] truncate">{value.title}</p>
              <p className="text-xs text-[#2c2c2c]/70">{value.year}</p>
            </div>
            <button
              onClick={handleRemove}
              className="flex-shrink-0 w-8 h-8 bg-accent-red text-white rounded-lg border-[2px] border-black hover:translate-y-[-2px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a movie..."
            className="w-full px-4 py-3 border-[3px] border-black dark:border-white rounded-xl bg-bg-card text-text-primary font-medium shadow-[3px_3px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-accent-red"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-red"></div>
            </div>
          )}
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border-[3px] border-black dark:border-white rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] max-h-64 overflow-y-auto z-50">
              {results.map((movie) => (
                <button
                  key={movie.imdbId}
                  onClick={() => handleSelect(movie)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent-yellow/20 transition-colors border-b-[2px] border-black/10 last:border-0"
                >
                  <div className="w-12 h-16 rounded overflow-hidden border-2 border-black flex-shrink-0">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-bold text-sm text-text-primary truncate">{movie.title}</p>
                    <p className="text-xs text-text-secondary">{movie.year}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PuzzleSubmissionEditor - Editor for users to create and submit Reel Connections puzzles
 */
export default function PuzzleSubmissionEditor({ onSubmit, loading }) {
  const [groups, setGroups] = useState(
    DIFFICULTY_LEVELS.map((level) => ({
      difficulty: level.id,
      connection: '',
      movies: [null, null, null, null],
    }))
  );
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleConnectionChange = (groupIndex, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].connection = value;
    setGroups(newGroups);
  };

  const handleMovieChange = (groupIndex, movieIndex, movie) => {
    const newGroups = [...groups];
    newGroups[groupIndex].movies[movieIndex] = movie;
    setGroups(newGroups);
  };

  const handleSubmit = () => {
    // Validate all groups have connections and 4 movies
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (!group.connection.trim()) {
        alert(`Please enter a connection for the ${DIFFICULTY_LEVELS[i].label} group`);
        return;
      }
      const movieCount = group.movies.filter((m) => m !== null).length;
      if (movieCount !== 4) {
        alert(
          `Please select exactly 4 movies for the ${DIFFICULTY_LEVELS[i].label} group (currently ${movieCount})`
        );
        return;
      }
    }

    const puzzleData = {
      isAnonymous,
      groups: groups.map((group, index) => ({
        difficulty: group.difficulty,
        connection: group.connection,
        order: index + 1,
        movies: group.movies.map((movie, movieIndex) => ({
          imdbId: movie.imdbId,
          title: movie.title,
          year: movie.year,
          poster: movie.poster,
          order: movieIndex + 1,
        })),
      })),
    };

    onSubmit(puzzleData);
  };

  const completedGroups = groups.filter(
    (g) => g.connection.trim() && g.movies.filter((m) => m !== null).length === 4
  ).length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-text-primary mb-2">Create Your Puzzle</h3>
        <p className="text-sm text-text-secondary">
          Build your own Reel Connections puzzle! Each group needs a theme and 4 movies that share
          that connection.
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          Movie posters provided by The Open Movie Database (OMDb), which hosts over 280,000 posters
          updated daily. Note: Not every movie poster is available. Only movies with posters present
          will be accepted.
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-6">
        {groups.map((group, groupIndex) => {
          const levelInfo = DIFFICULTY_LEVELS[groupIndex];
          const movieCount = group.movies.filter((m) => m !== null).length;
          const isComplete = group.connection.trim() && movieCount === 4;

          return (
            <div
              key={levelInfo.id}
              className={`${levelInfo.color} rounded-2xl border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] ${isComplete ? 'ring-2 ring-green-500' : ''}`}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-sm font-bold ${levelInfo.textColor}`}>
                    {levelInfo.label} - Connection
                  </label>
                  {isComplete && (
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Complete
                    </span>
                  )}
                </div>
                <p className={`text-xs ${levelInfo.textColor} opacity-70 mb-2`}>
                  {levelInfo.description}
                </p>
                <input
                  type="text"
                  value={group.connection}
                  onChange={(e) => handleConnectionChange(groupIndex, e.target.value)}
                  placeholder={levelInfo.placeholder}
                  maxLength={100}
                  className="w-full px-4 py-2 border-[3px] border-black rounded-xl bg-ghost-white text-[#2c2c2c] font-medium shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-accent-red"
                />
                <p className={`text-xs ${levelInfo.textColor} opacity-50 mt-1 text-right`}>
                  {group.connection.length}/100
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.movies.map((movie, movieIndex) => (
                  <div key={movieIndex}>
                    <label className={`block text-xs font-bold ${levelInfo.textColor} mb-1`}>
                      Movie {movieIndex + 1}
                    </label>
                    <MovieSearchInput
                      value={movie}
                      onChange={(selectedMovie) =>
                        handleMovieChange(groupIndex, movieIndex, selectedMovie)
                      }
                      groupColor="bg-ghost-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Anonymous Toggle */}
      <div className="mt-6 p-4 bg-bg-card rounded-2xl border-[2px] border-black dark:border-white">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-black accent-accent-red"
          />
          <span className="font-medium text-text-primary">Submit anonymously</span>
        </label>
        <p className="mt-2 text-xs text-text-secondary ml-8">
          {isAnonymous
            ? "Your puzzle will be credited to 'An anonymous member'"
            : 'Your puzzle will be credited to your username'}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border-[2px] border-amber-300 dark:border-amber-700">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> By submitting, you agree that Tandem may revise or edit your puzzle
          as needed. Submitted puzzles are reviewed before publication and may not be used.
        </p>
      </div>

      {/* Submit Button */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={loading || completedGroups < 4}
          className="w-full px-6 py-4 bg-accent-green text-white border-[3px] border-black dark:border-white font-bold rounded-2xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[4px_4px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading
            ? 'Submitting...'
            : completedGroups < 4
              ? `Complete all 4 groups to submit`
              : 'Submit Puzzle'}
        </button>
      </div>
    </div>
  );
}
