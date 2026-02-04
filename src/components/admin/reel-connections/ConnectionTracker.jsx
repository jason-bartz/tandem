'use client';
import { useState, useEffect, useMemo } from 'react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

const DIFFICULTY_COLORS = {
  easiest: 'bg-yellow-300 text-[#2c2c2c]',
  easy: 'bg-blue-400 text-[#2c2c2c]',
  medium: 'bg-purple-400 text-[#2c2c2c]',
  hardest: 'bg-red-500 text-white',
};

export default function ConnectionTracker({ onEditPuzzle }) {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    fetchAllPuzzles();
  }, []);

  const fetchAllPuzzles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reel-connections/puzzles?limit=730', {
        headers: await authService.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch puzzles');
      }

      const data = await response.json();
      setPuzzles(data.puzzles || []);
    } catch (err) {
      logger.error('Error fetching Reel Connections puzzles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Find duplicate connections across all puzzles
  const findDuplicateConnections = useMemo(() => {
    const connectionMap = {};
    const duplicates = new Set();

    puzzles.forEach((puzzle) => {
      puzzle.groups?.forEach((group) => {
        const normalizedConnection = group.connection.toLowerCase().trim();
        if (!connectionMap[normalizedConnection]) {
          connectionMap[normalizedConnection] = [];
        }
        connectionMap[normalizedConnection].push({
          date: puzzle.date,
          puzzleId: puzzle.id,
        });
      });
    });

    Object.entries(connectionMap).forEach(([_connection, occurrences]) => {
      if (occurrences.length > 1) {
        occurrences.forEach((occ) => duplicates.add(`${occ.date}-${occ.puzzleId}`));
      }
    });

    return { duplicates, connectionMap };
  }, [puzzles]);

  // Find similar connections (>50% word overlap)
  const findSimilarConnections = useMemo(() => {
    const similar = {};

    const calculateSimilarity = (str1, str2) => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();

      if (s1 === s2) return 1;

      const words1 = new Set(s1.split(' ').filter((w) => w.length > 2));
      const words2 = new Set(s2.split(' ').filter((w) => w.length > 2));
      const intersection = [...words1].filter((x) => words2.has(x));
      const union = new Set([...words1, ...words2]);

      return union.size > 0 ? intersection.length / union.size : 0;
    };

    // Collect all connections with their puzzle dates
    const allConnections = [];
    puzzles.forEach((puzzle) => {
      puzzle.groups?.forEach((group) => {
        allConnections.push({
          connection: group.connection,
          date: puzzle.date,
          puzzleId: puzzle.id,
        });
      });
    });

    // Compare connections
    allConnections.forEach((conn1, i) => {
      allConnections.forEach((conn2, j) => {
        if (i >= j) return;
        if (conn1.date === conn2.date) return; // Skip same puzzle

        const similarity = calculateSimilarity(conn1.connection, conn2.connection);
        if (similarity > 0.5 && similarity < 1) {
          const key1 = `${conn1.date}`;
          const key2 = `${conn2.date}`;
          if (!similar[key1]) similar[key1] = [];
          if (!similar[key2]) similar[key2] = [];
          if (!similar[key1].includes(key2)) similar[key1].push(key2);
          if (!similar[key2].includes(key1)) similar[key2].push(key1);
        }
      });
    });

    return similar;
  }, [puzzles]);

  // Check if a puzzle has any duplicate connections
  const hasDuplicateConnection = (puzzle) => {
    return puzzle.groups?.some((group) => {
      const normalizedConnection = group.connection.toLowerCase().trim();
      const occurrences = findDuplicateConnections.connectionMap[normalizedConnection] || [];
      return occurrences.length > 1;
    });
  };

  const filteredAndSortedPuzzles = useMemo(() => {
    let filtered = [...puzzles];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((puzzle) => {
        // Search in date
        if (puzzle.date.includes(searchTerm)) return true;

        // Search in connections
        const hasMatchingConnection = puzzle.groups?.some((group) =>
          group.connection.toLowerCase().includes(term)
        );
        if (hasMatchingConnection) return true;

        // Search in movie titles
        const hasMatchingMovie = puzzle.groups?.some((group) =>
          group.movies?.some((movie) => movie.title.toLowerCase().includes(term))
        );
        if (hasMatchingMovie) return true;

        return false;
      });
    }

    if (dateRange.start) {
      filtered = filtered.filter((puzzle) => puzzle.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter((puzzle) => puzzle.date <= dateRange.end);
    }

    if (showDuplicatesOnly) {
      filtered = filtered.filter((puzzle) => hasDuplicateConnection(puzzle));
    }

    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'date':
          compareValue = a.date.localeCompare(b.date);
          break;
        case 'connection':
          compareValue = (a.groups?.[0]?.connection || '').localeCompare(
            b.groups?.[0]?.connection || ''
          );
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [
    puzzles,
    searchTerm,
    dateRange,
    sortBy,
    sortOrder,
    showDuplicatesOnly,
    findDuplicateConnections.connectionMap,
  ]);

  const exportToCSV = () => {
    const csvRows = [
      ['Date', 'Connection', 'Difficulty', 'Movie 1', 'Movie 2', 'Movie 3', 'Movie 4', 'Duplicate'],
    ];

    filteredAndSortedPuzzles.forEach((puzzle) => {
      puzzle.groups?.forEach((group) => {
        const normalizedConnection = group.connection.toLowerCase().trim();
        const occurrences = findDuplicateConnections.connectionMap[normalizedConnection] || [];
        const isDuplicate = occurrences.length > 1;

        const movies = group.movies || [];
        csvRows.push([
          puzzle.date,
          `"${group.connection}"`,
          group.difficulty,
          movies[0]?.title ? `"${movies[0].title}"` : '',
          movies[1]?.title ? `"${movies[1].title}"` : '',
          movies[2]?.title ? `"${movies[2].title}"` : '',
          movies[3]?.title ? `"${movies[3].title}"` : '',
          isDuplicate ? 'Yes' : 'No',
        ]);
      });
    });

    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reel-connections-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const allConnections = [];
    puzzles.forEach((puzzle) => {
      puzzle.groups?.forEach((group) => {
        allConnections.push(group.connection.toLowerCase().trim());
      });
    });

    const uniqueConnections = new Set(allConnections);
    const duplicateCount = Object.values(findDuplicateConnections.connectionMap).filter(
      (arr) => arr.length > 1
    ).length;

    const today = new Date().toISOString().split('T')[0];
    const pastPuzzles = puzzles.filter((p) => p.date < today);
    const futurePuzzles = puzzles.filter((p) => p.date >= today);

    return {
      total: puzzles.length,
      unique: uniqueConnections.size,
      duplicates: duplicateCount,
      past: pastPuzzles.length,
      future: futurePuzzles.length,
    };
  }, [puzzles, findDuplicateConnections.connectionMap]);

  const getConnectionIndicator = (puzzle) => {
    const hasDuplicate = hasDuplicateConnection(puzzle);
    const hasSimilar = findSimilarConnections[puzzle.date]?.length > 0;

    if (hasDuplicate) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Duplicate
        </span>
      );
    } else if (hasSimilar) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Similar
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Unique
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-accent-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-accent-red/20 border-[3px] border-accent-red rounded-lg p-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-text-primary font-bold">Error: {error}</p>
        <button
          onClick={fetchAllPuzzles}
          className="mt-2 px-4 py-2 bg-accent-red border-[3px] border-black text-white rounded font-bold hover:translate-y-[-2px] transition-transform"
          style={{ boxShadow: 'var(--shadow-button)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div
        className="bg-bg-surface rounded-lg border-[3px] border-black p-4 sm:p-6"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
          <div
            className="p-3 bg-bg-card rounded-lg border-[2px] border-black"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="text-xl sm:text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-xs sm:text-sm text-text-secondary font-medium">Total Puzzles</div>
          </div>
          <div
            className="p-3 bg-bg-card rounded-lg border-[2px] border-accent-green"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="text-xl sm:text-2xl font-bold text-text-primary">{stats.unique}</div>
            <div className="text-xs sm:text-sm text-text-secondary font-medium">
              Unique Connections
            </div>
          </div>
          <div
            className="p-3 bg-bg-card rounded-lg border-[2px] border-accent-red"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="text-xl sm:text-2xl font-bold text-text-primary">
              {stats.duplicates}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary font-medium">
              Duplicate Connections
            </div>
          </div>
          <div
            className="p-3 bg-bg-card rounded-lg border-[2px] border-accent-blue"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="text-xl sm:text-2xl font-bold text-text-primary">{stats.past}</div>
            <div className="text-xs sm:text-sm text-text-secondary font-medium">Past Puzzles</div>
          </div>
          <div
            className="p-3 bg-bg-card rounded-lg border-[2px] border-accent-pink"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="text-xl sm:text-2xl font-bold text-text-primary">{stats.future}</div>
            <div className="text-xs sm:text-sm text-text-secondary font-medium">Scheduled</div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div
        className="bg-bg-surface rounded-lg border-[3px] border-black"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="p-3 sm:p-4 border-b-[3px] border-black">
          <div className="flex flex-col gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Search connections, dates, or movies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
              style={{ boxShadow: 'var(--shadow-small)' }}
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
                placeholder="Start Date"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
                placeholder="End Date"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black rounded-lg bg-bg-card text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
              >
                <option value="date">Sort by Date</option>
                <option value="connection">Sort by Connection</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-black bg-bg-card text-text-primary rounded-lg font-bold hover:bg-accent-yellow/20 transition-colors"
                style={{ boxShadow: 'var(--shadow-small)' }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>

              <button
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-bold border-[3px] border-black transition-transform whitespace-nowrap ${
                  showDuplicatesOnly
                    ? 'bg-accent-red text-white hover:translate-y-[-2px]'
                    : 'bg-bg-card text-text-primary hover:bg-accent-red/20'
                }`}
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                {showDuplicatesOnly ? 'Show All' : 'Duplicates'}
              </button>

              <button
                onClick={exportToCSV}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-accent-blue border-[3px] border-black text-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform whitespace-nowrap"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-full divide-y-[3px] divide-black">
            <thead className="bg-bg-card">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                  Connections
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider hidden lg:table-cell">
                  Movies
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                  Indicator
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-bg-surface divide-y-[2px] divide-black">
              {filteredAndSortedPuzzles.map((puzzle) => {
                const similarDates = findSimilarConnections[puzzle.date] || [];

                return (
                  <tr key={puzzle.id} className="hover:bg-bg-card transition-colors">
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-text-primary align-top">
                      {formatDateDisplay(puzzle.date)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-primary font-medium align-top">
                      <div className="space-y-1.5">
                        {puzzle.groups?.map((group, idx) => {
                          const normalizedConnection = group.connection.toLowerCase().trim();
                          const occurrences =
                            findDuplicateConnections.connectionMap[normalizedConnection] || [];
                          const isDuplicate = occurrences.length > 1;

                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span
                                className={`inline-flex px-1.5 py-0.5 text-[10px] sm:text-xs rounded font-bold ${DIFFICULTY_COLORS[group.difficulty]}`}
                              >
                                {group.difficulty.charAt(0).toUpperCase()}
                              </span>
                              <span className={isDuplicate ? 'text-accent-red font-bold' : ''}>
                                {group.connection}
                              </span>
                              {isDuplicate && (
                                <span className="text-[10px] text-accent-red">
                                  ({occurrences.length}x)
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {similarDates.length > 0 && (
                          <div className="text-[10px] sm:text-xs text-text-secondary font-medium mt-1">
                            Similar to: {similarDates.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-primary hidden lg:table-cell align-top">
                      <div className="space-y-1.5">
                        {puzzle.groups?.map((group, idx) => (
                          <div key={idx} className="flex flex-wrap gap-1">
                            {group.movies?.map((movie, midx) => (
                              <span
                                key={midx}
                                className="text-[10px] sm:text-xs bg-bg-card border-[1px] border-black px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
                                title={`${movie.title} (${movie.year})`}
                              >
                                {movie.title}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap align-top">
                      {getConnectionIndicator(puzzle)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap align-top">
                      <button
                        onClick={() => onEditPuzzle && onEditPuzzle(puzzle)}
                        className="px-2 sm:px-3 py-1 bg-accent-green border-[2px] border-black text-white text-[10px] sm:text-xs rounded font-bold hover:translate-y-[-1px] transition-transform"
                        style={{ boxShadow: 'var(--shadow-small)' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredAndSortedPuzzles.length === 0 && (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-text-secondary font-medium">
              No puzzles found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
