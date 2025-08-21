'use client';
import { useState, useEffect } from 'react';
import statsService from '@/services/stats.service';

export default function StatsOverview() {
  const [stats, setStats] = useState({
    played: 0,
    completed: 0,
    views: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const globalStats = await statsService.getGlobalStats();
      setStats(globalStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, color = 'plum' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div className={`mt-2 text-3xl font-bold bg-gradient-to-r from-${color} to-peach bg-clip-text text-transparent`}>
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

  return (
    <div className="space-y-6 w-full" style={{ minWidth: '700px' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Views" value={stats.views} />
        <StatCard title="Games Played" value={stats.played} />
        <StatCard title="Games Completed" value={stats.completed} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Daily Activity
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>Activity chart coming soon...</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Popular Puzzles
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">Weather Patterns</span>
            <span className="text-gray-500 dark:text-gray-400">89% completion</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">Kitchen Items</span>
            <span className="text-gray-500 dark:text-gray-400">76% completion</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">Sports</span>
            <span className="text-gray-500 dark:text-gray-400">71% completion</span>
          </div>
        </div>
      </div>
    </div>
  );
}