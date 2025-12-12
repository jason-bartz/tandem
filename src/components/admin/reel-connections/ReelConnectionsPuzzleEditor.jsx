'use client';

import { useState, useEffect, useRef } from 'react';
import authService from '@/services/auth.service';
import ReelConnectionsAIGenerator from './ReelConnectionsAIGenerator';
import logger from '@/lib/logger';

const DIFFICULTY_LEVELS = [
  {
    id: 'easiest',
    label: 'Easiest',
    color: 'bg-yellow-300',
    textColor: 'text-[#2c2c2c]',
    order: 1,
  },
  { id: 'easy', label: 'Easy', color: 'bg-blue-400', textColor: 'text-[#2c2c2c]', order: 2 },
  { id: 'medium', label: 'Medium', color: 'bg-purple-400', textColor: 'text-[#2c2c2c]', order: 3 },
  { id: 'hardest', label: 'Hardest', color: 'bg-red-500', textColor: 'text-white', order: 4 },
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
    // Close dropdown when clicking outside
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

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/reel-connections/search?q=${encodeURIComponent(query)}`,
          {
            headers: await authService.getAuthHeaders(),
          }
        );
        const data = await response.json();
        setResults(data.movies || []);
        setShowResults(true);
      } catch (error) {
        logger.error('Search error:', error);
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
 * ReelConnectionsPuzzleEditor - Editor for creating/editing Reel Connections puzzles
 */
export default function ReelConnectionsPuzzleEditor({ puzzle, date, onSave, onCancel, loading }) {
  const [groups, setGroups] = useState(
    DIFFICULTY_LEVELS.map((level) => ({
      difficulty: level.id,
      connection: '',
      movies: [null, null, null, null],
    }))
  );
  const [selectedDate, setSelectedDate] = useState(date || '');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGeneratingForGroup, setAiGeneratingForGroup] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Track creator attribution for user-submitted puzzles
  const [creatorName, setCreatorName] = useState(puzzle?.creatorName || null);
  const [isUserSubmitted, setIsUserSubmitted] = useState(puzzle?.isUserSubmitted || false);

  // Update selected date when prop changes
  useEffect(() => {
    if (date) {
      setSelectedDate(date);
    }
  }, [date]);

  // Update creator info when puzzle changes
  useEffect(() => {
    if (puzzle) {
      setCreatorName(puzzle.creatorName || null);
      setIsUserSubmitted(puzzle.isUserSubmitted || false);
    }
  }, [puzzle]);

  useEffect(() => {
    if (puzzle && puzzle.groups) {
      // Load existing puzzle data
      const loadedGroups = DIFFICULTY_LEVELS.map((level) => {
        const existingGroup = puzzle.groups.find((g) => g.difficulty === level.id);
        if (existingGroup) {
          // Transform movie data from snake_case (database) to camelCase (component)
          const transformedMovies = (existingGroup.movies || []).map((movie) => {
            if (!movie) return null;
            return {
              imdbId: movie.imdb_id || movie.imdbId,
              title: movie.title,
              year: movie.year,
              poster: movie.poster,
            };
          });
          // Pad with nulls if fewer than 4 movies
          while (transformedMovies.length < 4) {
            transformedMovies.push(null);
          }
          return {
            difficulty: level.id,
            connection: existingGroup.connection || '',
            movies: transformedMovies,
          };
        }
        return {
          difficulty: level.id,
          connection: '',
          movies: [null, null, null, null],
        };
      });
      setGroups(loadedGroups);
    }
  }, [puzzle]);

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

  const handleSave = () => {
    // Validate date is selected
    if (!selectedDate) {
      alert('Please select a date for this puzzle');
      return;
    }

    // Validate all groups have connections and 4 movies
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (!group.connection.trim()) {
        alert(`Please enter a connection for ${DIFFICULTY_LEVELS[i].label} group`);
        return;
      }
      const movieCount = group.movies.filter((m) => m !== null).length;
      if (movieCount !== 4) {
        alert(
          `Please select exactly 4 movies for ${DIFFICULTY_LEVELS[i].label} group (currently ${movieCount})`
        );
        return;
      }
    }

    const puzzleData = {
      date: selectedDate,
      groups: groups.map((group, index) => ({
        difficulty: group.difficulty,
        connection: group.connection,
        order: index + 1,
        movies: group.movies.map((movie, movieIndex) => ({
          ...movie,
          order: movieIndex + 1,
        })),
      })),
      // Include creator attribution if this is from a user submission
      ...(isUserSubmitted && {
        creatorName,
        isUserSubmitted: true,
      }),
    };

    onSave(puzzleData);
  };

  const handleAIGenerate = async ({ connection, difficulty }) => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/admin/reel-connections/generate', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ connection, difficulty }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate movies');
      }

      // Update the group with AI-generated data
      const newGroups = [...groups];
      newGroups[aiGeneratingForGroup].connection = data.connection;
      newGroups[aiGeneratingForGroup].movies = data.movies;
      setGroups(newGroups);

      setShowAIGenerator(false);
      setAiGeneratingForGroup(null);
    } catch (error) {
      logger.error('AI generation error:', error);
      alert(error.message || 'Failed to generate movies. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenAIGenerator = (groupIndex) => {
    setAiGeneratingForGroup(groupIndex);
    setShowAIGenerator(true);
  };

  return (
    <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-text-primary">
              {puzzle ? 'Edit Puzzle' : 'Create New Puzzle'}
            </h3>
            {isUserSubmitted && (
              <span className="px-2 py-1 bg-accent-green/20 text-accent-green text-xs font-bold rounded-lg border-[2px] border-accent-green">
                User Submission
              </span>
            )}
          </div>
          {selectedDate ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-text-secondary font-medium">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {!date && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-accent-blue hover:underline font-medium"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary font-medium">Select date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 border-[2px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-medium text-sm"
              />
            </div>
          )}
          {isUserSubmitted && creatorName && (
            <p className="text-xs text-text-secondary mt-1">
              Submitted by: <span className="font-bold">{creatorName}</span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group, groupIndex) => {
          const levelInfo = DIFFICULTY_LEVELS[groupIndex];
          return (
            <div
              key={levelInfo.id}
              className={`${levelInfo.color} rounded-xl border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]`}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-bold ${levelInfo.textColor}`}>
                    {levelInfo.label} - Connection
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAIGenerator(groupIndex)}
                    disabled={loading || aiLoading}
                    className="flex items-center gap-1 px-3 py-1 bg-ghost-white text-[#2c2c2c] border-[2px] border-black rounded-lg hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    AI Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={group.connection}
                  onChange={(e) => handleConnectionChange(groupIndex, e.target.value)}
                  placeholder="e.g., Movies directed by Steven Spielberg"
                  className="w-full px-4 py-2 border-[3px] border-black rounded-lg bg-ghost-white text-[#2c2c2c] font-medium shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-accent-red"
                />
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

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-accent-green text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Puzzle'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 bg-bg-card text-text-primary border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {/* AI Generator Modal */}
      {showAIGenerator && (
        <ReelConnectionsAIGenerator
          onGenerate={handleAIGenerate}
          onClose={() => {
            setShowAIGenerator(false);
            setAiGeneratingForGroup(null);
          }}
          loading={aiLoading}
          initialConnection={groups[aiGeneratingForGroup]?.connection || ''}
          initialDifficulty={DIFFICULTY_LEVELS[aiGeneratingForGroup]?.id || 'medium'}
        />
      )}
    </div>
  );
}
