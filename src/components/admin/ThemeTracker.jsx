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
            <div className="text-xs sm:text-sm text-text-secondary font-medium">Unique Themes</div>
          </div>
          <div
            className="p-3 bg-bg-card rounded-lg border-[2px] border-accent-red"
            style={{ boxShadow: 'var(--shadow-small)' }}
          >
            <div className="text-xl sm:text-2xl font-bold text-text-primary">
              {stats.duplicates}
            </div>
            <div className="text-xs sm:text-sm text-text-secondary font-medium">Duplicates</div>
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

      <div
        className="bg-bg-surface rounded-lg border-[3px] border-black"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="p-3 sm:p-4 border-b-[3px] border-black">
          <div className="flex flex-col gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Search themes, dates, or answers..."
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
                <option value="theme">Sort by Theme</option>
                <option value="status">Sort by Status</option>
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
                  Theme
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-text-primary uppercase tracking-wider">
                  Answers
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
                const similarThemes = findSimilarThemes[puzzle.date] || [];

                return (
                  <tr key={puzzle.date} className="hover:bg-bg-card transition-colors">
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-text-primary">
                      {formatDateDisplay(puzzle.date)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-primary font-medium">
                      <div>
                        {puzzle.theme}
                        {similarThemes.length > 0 && (
                          <div className="text-[10px] sm:text-xs text-text-secondary font-medium mt-1">
                            Similar to: {similarThemes.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span
                        className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded font-bold border-[2px] ${
                          puzzle.status === 'past'
                            ? 'bg-text-muted/20 border-black text-text-primary'
                            : 'bg-accent-blue/20 border-accent-blue text-text-primary'
                        }`}
                      >
                        {puzzle.status === 'past' ? 'Past' : 'Future'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-primary">
                      <div className="flex flex-wrap gap-1">
                        {puzzle.puzzles.map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] sm:text-xs bg-bg-card border-[2px] border-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-medium"
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
