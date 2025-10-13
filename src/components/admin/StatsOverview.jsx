'use client';
import { useState, useEffect } from 'react';
import { ActivityChart, CompletionRateChart, MetricsOverview } from './StatsChart';

export default function StatsOverview() {
  const [stats, setStats] = useState({
    played: 0,
    completed: 0,
    views: 0,
    completionRate: 0,
    uniquePlayers: 0,
    averageTime: 0,
    perfectGames: 0,
    gamesShared: 0,
  });
  const [popularPuzzles, setPopularPuzzles] = useState([]);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setPopularPuzzles(data.popularPuzzles || []);
        setDailyActivity(data.dailyActivity || []);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, color = 'plum' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div
        className={`mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold bg-gradient-to-r from-${color} to-peach bg-clip-text text-transparent`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Prepare CSV data
      const csvData = [];

      // Add header
      csvData.push(['Tandem Puzzle Statistics Export']);
      csvData.push(['Generated on', new Date().toLocaleString()]);
      csvData.push([]);

      // Global stats
      csvData.push(['Global Statistics']);
      csvData.push(['Metric', 'Value']);
      csvData.push(['Total Views', stats.views]);
      csvData.push(['Games Played', stats.played]);
      csvData.push(['Games Completed', stats.completed]);
      csvData.push(['Completion Rate', `${stats.completionRate}%`]);
      csvData.push(['Unique Players', stats.uniquePlayers]);
      csvData.push(['Average Time', formatTime(stats.averageTime)]);
      csvData.push(['Perfect Games', stats.perfectGames]);
      csvData.push(['Games Shared', stats.gamesShared]);
      csvData.push([]);

      // Daily activity
      csvData.push(['Daily Activity']);
      csvData.push(['Date', 'Plays', 'Completions', 'Unique Players']);
      dailyActivity.forEach((day) => {
        csvData.push([
          new Date(day.date).toLocaleDateString(),
          day.plays,
          day.completions,
          day.uniquePlayers,
        ]);
      });
      csvData.push([]);

      // Popular puzzles
      csvData.push(['Top Performing Puzzles']);
      csvData.push(['Date', 'Theme', 'Plays', 'Completions', 'Completion Rate']);
      popularPuzzles.forEach((puzzle) => {
        csvData.push([
          new Date(puzzle.date).toLocaleDateString(),
          puzzle.theme,
          puzzle.played,
          puzzle.completed,
          `${puzzle.completionRate}%`,
        ]);
      });

      // Convert to CSV string
      const csvContent = csvData
        .map((row) =>
          row
            .map((cell) => {
              // Escape quotes and wrap in quotes if contains comma
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        )
        .join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tandem-stats-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export statistics');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Statistics Overview
        </h2>
        <button
          onClick={exportToCSV}
          disabled={exporting || loading}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard title="Total Views" value={stats.views} />
        <StatCard title="Games Played" value={stats.played} />
        <StatCard title="Games Completed" value={stats.completed} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard title="Unique Players" value={stats.uniquePlayers} color="sky" />
        <StatCard
          title="Avg Time"
          value={stats.averageTime ? formatTime(stats.averageTime) : '0:00'}
          color="emerald"
        />
        <StatCard title="Perfect Games" value={stats.perfectGames} color="amber" />
        <StatCard title="Games Shared" value={stats.gamesShared} color="rose" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
          Engagement Metrics
        </h3>
        <MetricsOverview stats={stats} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
          Daily Activity (Last 7 Days)
        </h3>
        {dailyActivity.length > 0 ? (
          <ActivityChart data={dailyActivity} />
        ) : (
          <div className="h-48 sm:h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm sm:text-base">No activity data available yet</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
          Top Performing Puzzles
        </h3>
        {popularPuzzles.length > 0 ? (
          <CompletionRateChart data={popularPuzzles} />
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-center py-6 sm:py-8">
            <p className="text-sm sm:text-base">Not enough data yet</p>
            <p className="text-xs sm:text-sm mt-1">Puzzles need at least 10 plays to appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
