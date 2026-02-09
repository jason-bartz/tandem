'use client';

import { useState, useEffect, useRef } from 'react';
import authService from '@/services/auth.service';
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
function MovieSearchInput({ value, onChange, groupColor, onShuffle, shuffleLoading, canShuffle }) {
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
            <div className="flex flex-row sm:flex-col gap-1 flex-shrink-0">
              {canShuffle && (
                <button
                  onClick={onShuffle}
                  disabled={shuffleLoading}
                  className="w-8 h-8 sm:w-auto sm:h-auto sm:px-2 sm:py-1.5 bg-accent-green text-white rounded-lg border-[2px] border-black hover:translate-y-[-2px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                  title="Generate new movie"
                >
                  {shuffleLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Shuffle</span>
                </button>
              )}
              <a
                href={`https://www.imdb.com/title/${value.imdbId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 sm:w-auto sm:h-auto sm:px-2 sm:py-1.5 bg-[#F5C518] text-black rounded-lg border-[2px] border-black hover:translate-y-[-2px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold flex items-center justify-center gap-1 text-xs"
                title="View on IMDb"
              >
                <span className="sm:hidden">i</span>
                <span className="hidden sm:inline">IMDb</span>
              </a>
              <button
                onClick={handleRemove}
                className="w-8 h-8 sm:w-auto sm:h-auto sm:px-2 sm:py-1.5 bg-accent-red text-white rounded-lg border-[2px] border-black hover:translate-y-[-2px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold flex items-center justify-center gap-1 text-xs"
              >
                <span className="sm:hidden">×</span>
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a movie..."
            className="w-full px-3 py-1.5 text-sm border-[2px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-medium shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-accent-red"
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
export default function ReelConnectionsPuzzleEditor({
  puzzle,
  date,
  onSave,
  onCancel,
  loading,
  onShowConnections,
}) {
  const [groups, setGroups] = useState(
    DIFFICULTY_LEVELS.map((level) => ({
      difficulty: level.id,
      connection: '',
      connectionContext: '',
      movies: [null, null, null, null],
    }))
  );
  const [selectedDate, setSelectedDate] = useState(date || '');
  const [generatingForGroup, setGeneratingForGroup] = useState(null);
  const [shuffleLoading, setShuffleLoading] = useState({}); // { "groupIndex-movieIndex": true }
  const [suggestions, setSuggestions] = useState({});
  const [suggestionsLoading, setSuggestionsLoading] = useState({});

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
            connectionContext: existingGroup.connectionContext || '',
            movies: transformedMovies,
          };
        }
        return {
          difficulty: level.id,
          connection: '',
          connectionContext: '',
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

  const handleConnectionContextChange = (groupIndex, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].connectionContext = value;
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

  const handleGenerate = async (groupIndex) => {
    const group = groups[groupIndex];
    const connection = group.connection.trim();
    const context = group.connectionContext?.trim() || '';
    const difficulty = DIFFICULTY_LEVELS[groupIndex].id;

    if (!connection || connection.length < 3) {
      alert('Please enter a connection (at least 3 characters) before generating');
      return;
    }

    setGeneratingForGroup(groupIndex);
    try {
      const response = await fetch('/api/admin/reel-connections/generate', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ connection, difficulty, context }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate movies');
      }

      if (response.status === 206) {
        throw new Error(data.details || 'Some movies could not be verified. Please try again.');
      }

      if (!data.movies || !Array.isArray(data.movies) || data.movies.length !== 4) {
        throw new Error('Invalid response from AI - expected 4 movies');
      }

      // Update the group with AI-generated data
      const newGroups = [...groups];
      newGroups[groupIndex].connection = data.connection;
      newGroups[groupIndex].movies = data.movies;
      setGroups(newGroups);
    } catch (error) {
      logger.error('AI generation error:', error);
      alert(error.message || 'Failed to generate movies. Please try again.');
    } finally {
      setGeneratingForGroup(null);
    }
  };

  const handleShuffleMovie = async (groupIndex, movieIndex) => {
    const group = groups[groupIndex];
    const connection = group.connection.trim();
    const context = group.connectionContext?.trim() || '';
    const difficulty = DIFFICULTY_LEVELS[groupIndex].id;

    if (!connection || connection.length < 3) {
      alert('Please enter a connection before shuffling movies');
      return;
    }

    const key = `${groupIndex}-${movieIndex}`;
    setShuffleLoading((prev) => ({ ...prev, [key]: true }));

    try {
      // Get existing movie titles to avoid duplicates
      const existingMovies = group.movies
        .filter((m, idx) => m !== null && idx !== movieIndex)
        .map((m) => m.title);

      const response = await fetch('/api/admin/reel-connections/regenerate-movie', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ connection, difficulty, context, existingMovies }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate movie');
      }

      if (!data.movie) {
        throw new Error('Invalid response from AI');
      }

      // Update the specific movie slot
      const newGroups = [...groups];
      newGroups[groupIndex].movies[movieIndex] = data.movie;
      setGroups(newGroups);
    } catch (error) {
      logger.error('Movie shuffle error:', error);
      alert(error.message || 'Failed to generate movie. Please try again.');
    } finally {
      setShuffleLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSuggestIdeas = async (groupIndex) => {
    const difficulty = DIFFICULTY_LEVELS[groupIndex].id;

    // Collect existing connections from other groups to avoid duplicates
    const existingConnections = groups
      .filter((g, idx) => idx !== groupIndex && g.connection.trim())
      .map((g) => g.connection.trim());

    setSuggestionsLoading((prev) => ({ ...prev, [groupIndex]: true }));
    setSuggestions((prev) => ({ ...prev, [groupIndex]: [] }));

    try {
      const response = await fetch('/api/admin/reel-connections/suggest-connections', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ difficulty, existingConnections }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get suggestions');
      }

      const data = await response.json();
      setSuggestions((prev) => ({ ...prev, [groupIndex]: data.suggestions || [] }));
    } catch (error) {
      logger.error('Suggestions error:', error);
      alert(error.message || 'Failed to get suggestions');
    } finally {
      setSuggestionsLoading((prev) => ({ ...prev, [groupIndex]: false }));
    }
  };

  const handleSelectSuggestion = (groupIndex, suggestion) => {
    const newGroups = [...groups];
    newGroups[groupIndex].connection = suggestion.connection;
    setGroups(newGroups);
    setSuggestions((prev) => ({ ...prev, [groupIndex]: [] }));
  };

  return (
    <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white p-3 sm:p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
      <div className="flex justify-between items-start mb-4">
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
        {onShowConnections && (
          <button
            onClick={onShowConnections}
            className="px-2 py-1 bg-accent-blue text-white border-[2px] border-black dark:border-white font-bold rounded-lg hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            Tracker
          </button>
        )}
      </div>

      <div className="space-y-4">
        {groups.map((group, groupIndex) => {
          const levelInfo = DIFFICULTY_LEVELS[groupIndex];
          const isGenerating = generatingForGroup === groupIndex;
          const groupSuggestions = suggestions[groupIndex] || [];
          const isSuggestionsLoading = suggestionsLoading[groupIndex];

          return (
            <div
              key={levelInfo.id}
              className={`${levelInfo.color} rounded-xl border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]`}
            >
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-bold ${levelInfo.textColor}`}>
                    {levelInfo.label}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSuggestIdeas(groupIndex)}
                    disabled={loading || isSuggestionsLoading || isGenerating}
                    className="flex items-center gap-1 px-2 py-0.5 bg-ghost-white text-[#2c2c2c] border-[2px] border-black rounded-lg hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                  >
                    {isSuggestionsLoading ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        Suggest
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={group.connection}
                  onChange={(e) => handleConnectionChange(groupIndex, e.target.value)}
                  placeholder="e.g., Movies directed by Steven Spielberg"
                  className="w-full px-3 py-1.5 text-sm border-[2px] border-black rounded-lg bg-ghost-white text-[#2c2c2c] font-medium shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-accent-red"
                />

                {/* Suggestions */}
                {groupSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groupSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(groupIndex, suggestion)}
                        className="px-3 py-1.5 bg-ghost-white text-[#2c2c2c] border-[2px] border-black rounded-lg hover:bg-accent-yellow/30 transition-colors text-xs font-medium"
                        title={suggestion.description}
                      >
                        {suggestion.connection}
                      </button>
                    ))}
                  </div>
                )}

                {/* Connection Context */}
                <div className="mt-2 flex gap-2">
                  <div className="flex-1">
                    <label className={`block text-xs font-bold ${levelInfo.textColor} mb-1`}>
                      Context
                    </label>
                    <input
                      type="text"
                      value={group.connectionContext || ''}
                      onChange={(e) => handleConnectionContextChange(groupIndex, e.target.value)}
                      placeholder="e.g., exclude Arnold Schwarzenegger movies"
                      className="w-full px-3 py-1.5 text-sm border-[2px] border-black rounded-lg bg-ghost-white text-[#2c2c2c] font-medium shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-accent-red"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleGenerate(groupIndex)}
                      disabled={loading || isGenerating || !group.connection.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent-green text-white border-[2px] border-black rounded-lg hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold whitespace-nowrap"
                    >
                      {isGenerating ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        'Generate'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.movies.map((movie, movieIndex) => {
                  const shuffleKey = `${groupIndex}-${movieIndex}`;
                  const isShuffling = shuffleLoading[shuffleKey];
                  const canShuffle = group.connection.trim().length >= 3;

                  return (
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
                        onShuffle={() => handleShuffleMovie(groupIndex, movieIndex)}
                        shuffleLoading={isShuffling}
                        canShuffle={canShuffle}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-bg-card text-text-primary border-[2px] border-black dark:border-white font-bold rounded-md sm:rounded-lg hover:translate-y-[-1px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Back to Calendar</span>
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-accent-green text-white border-[2px] border-black dark:border-white font-bold rounded-md sm:rounded-lg hover:translate-y-[-1px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="sm:hidden">{loading ? 'Saving...' : 'Save'}</span>
          <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save Puzzle'}</span>
        </button>
        <button
          onClick={() => {
            setGroups(
              DIFFICULTY_LEVELS.map((level) => ({
                difficulty: level.id,
                connection: '',
                connectionContext: '',
                movies: [null, null, null, null],
              }))
            );
            setSuggestions({});
          }}
          disabled={loading}
          className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-accent-orange text-white border-[2px] border-black dark:border-white font-bold rounded-md sm:rounded-lg hover:translate-y-[-1px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
