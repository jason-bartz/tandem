'use client';
import { useEffect, useState } from 'react';
import { getStoredStats } from '@/lib/storage';

export default function PlayerStatsModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const playerStats = getStoredStats();
      setStats(playerStats);
    }
  }, [isOpen]);

  if (!isOpen || !stats) return null;

  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Your Statistics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {stats.gamesPlayed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Games Played
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {winRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Win Rate
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Current Streak
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {stats.maxStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Max Streak
            </div>
          </div>
        </div>
        
        {stats.averageTime && (
          <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl mb-6">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {stats.averageTime}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Average Time
            </div>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-plum to-peach text-white font-semibold rounded-xl"
        >
          Close
        </button>
      </div>
    </div>
  );
}