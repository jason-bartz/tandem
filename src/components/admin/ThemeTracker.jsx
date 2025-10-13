'use client';
import { useState, useEffect, useMemo } from 'react';
import adminService from '@/services/admin.service';

export default function ThemeTracker({ onEditPuzzle }) {
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
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      const oneYearAhead = new Date(today);
      oneYearAhead.setFullYear(today.getFullYear() + 1);

      const startDate = oneYearAgo.toISOString().split('T')[0];
      const endDate = oneYearAhead.toISOString().split('T')[0];

      const response = await adminService.getPuzzlesRange(startDate, endDate);

      if (response.success) {
        const puzzleList = Object.entries(response.puzzles).map(([date, puzzle]) => ({
          date,
          theme: puzzle.theme || 'No Theme',
          puzzles: puzzle.puzzles || [],
          status: new Date(date) < new Date() ? 'past' : 'future',
          createdBy: puzzle.createdBy || 'System',
          createdAt: puzzle.createdAt || null,
        }));
        setPuzzles(puzzleList);
      } else {
        setError('Failed to fetch puzzles');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const findDuplicateThemes = useMemo(() => {
    const themeMap = {};
    const duplicates = new Set();

    puzzles.forEach((puzzle) => {
      const normalizedTheme = puzzle.theme.toLowerCase().trim();
      if (!themeMap[normalizedTheme]) {
        themeMap[normalizedTheme] = [];
      }
      themeMap[normalizedTheme].push(puzzle.date);
    });

    Object.entries(themeMap).forEach(([_theme, dates]) => {
      if (dates.length > 1) {
        dates.forEach((date) => duplicates.add(date));
      }
    });

    return duplicates;
  }, [puzzles]);

  const findSimilarThemes = useMemo(() => {
    const similar = {};

    const calculateSimilarity = (str1, str2) => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();

      if (s1 === s2) {
        return 1;
      }

      const words1 = new Set(s1.split(' '));
      const words2 = new Set(s2.split(' '));
      const intersection = [...words1].filter((x) => words2.has(x));
      const union = new Set([...words1, ...words2]);

      return intersection.length / union.size;
    };

    puzzles.forEach((puzzle1, i) => {
      puzzles.forEach((puzzle2, j) => {
        if (i >= j) {
          return;
        }

        const similarity = calculateSimilarity(puzzle1.theme, puzzle2.theme);
        if (similarity > 0.5 && similarity < 1) {
          if (!similar[puzzle1.date]) {
            similar[puzzle1.date] = [];
          }
          if (!similar[puzzle2.date]) {
            similar[puzzle2.date] = [];
          }
          similar[puzzle1.date].push(puzzle2.date);
          similar[puzzle2.date].push(puzzle1.date);
        }
      });
    });

    return similar;
  }, [puzzles]);

  const filteredAndSortedPuzzles = useMemo(() => {
    let filtered = [...puzzles];

    if (searchTerm) {
      filtered = filtered.filter(
        (puzzle) =>
          puzzle.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
          puzzle.date.includes(searchTerm) ||
          puzzle.puzzles.some((p) => p.answer?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (dateRange.start) {
      filtered = filtered.filter((puzzle) => puzzle.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter((puzzle) => puzzle.date <= dateRange.end);
    }

    if (showDuplicatesOnly) {
      filtered = filtered.filter((puzzle) => findDuplicateThemes.has(puzzle.date));
    }

    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'date':
          compareValue = a.date.localeCompare(b.date);
          break;
        case 'theme':
          compareValue = a.theme.localeCompare(b.theme);
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [puzzles, searchTerm, dateRange, sortBy, sortOrder, showDuplicatesOnly, findDuplicateThemes]);

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Theme', 'Status', 'Answers', 'Created By', 'Duplicate', 'Similar To'].join(','),
      ...filteredAndSortedPuzzles.map((puzzle) => {
        const isDuplicate = findDuplicateThemes.has(puzzle.date);
        const similarTo = findSimilarThemes[puzzle.date] || [];
        const answers = puzzle.puzzles.map((p) => p.answer).join('; ');

        return [
          puzzle.date,
          `"${puzzle.theme}"`,
          puzzle.status,
          `"${answers}"`,
          puzzle.createdBy,
          isDuplicate ? 'Yes' : 'No',
          similarTo.length > 0 ? `"${similarTo.join(', ')}"` : '',
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `puzzle-themes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const uniqueThemes = new Set(puzzles.map((p) => p.theme.toLowerCase().trim()));
    const pastPuzzles = puzzles.filter((p) => p.status === 'past');
    const futurePuzzles = puzzles.filter((p) => p.status === 'future');

    return {
      total: puzzles.length,
      unique: uniqueThemes.size,
      duplicates: findDuplicateThemes.size,
      past: pastPuzzles.length,
      future: futurePuzzles.length,
    };
  }, [puzzles, findDuplicateThemes]);

  const getThemeIndicator = (puzzle) => {
    const isDuplicate = findDuplicateThemes.has(puzzle.date);
    const hasSimilar = findSimilarThemes[puzzle.date]?.length > 0;

    if (isDuplicate) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button
          onClick={fetchAllPuzzles}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Puzzles</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.unique}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Unique Themes</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.duplicates}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Duplicates</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.past}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Past Puzzles</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.future}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Scheduled</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Search themes, dates, or answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:text-white"
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:text-white"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:text-white"
                placeholder="End Date"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="date">Sort by Date</option>
                <option value="theme">Sort by Theme</option>
                <option value="status">Sort by Status</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>

              <button
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-colors whitespace-nowrap ${
                  showDuplicatesOnly
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {showDuplicatesOnly ? 'Show All' : 'Duplicates'}
              </button>

              <button
                onClick={exportToCSV}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors whitespace-nowrap"
              >
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Theme
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Answers
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Indicator
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedPuzzles.map((puzzle) => {
                const similarThemes = findSimilarThemes[puzzle.date] || [];

                return (
                  <tr key={puzzle.date} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {formatDateDisplay(puzzle.date)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white">
                      <div>
                        {puzzle.theme}
                        {similarThemes.length > 0 && (
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Similar to: {similarThemes.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span
                        className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded ${
                          puzzle.status === 'past'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}
                      >
                        {puzzle.status === 'past' ? 'Past' : 'Future'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-wrap gap-1">
                        {puzzle.puzzles.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                          >
                            {p.emoji} {p.answer}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      {getThemeIndicator(puzzle)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <button
                        onClick={() => onEditPuzzle && onEditPuzzle(puzzle.date)}
                        className="px-2 sm:px-3 py-1 bg-sky-500 text-white text-[10px] sm:text-xs rounded hover:bg-sky-600 transition-colors"
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
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              No puzzles found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
