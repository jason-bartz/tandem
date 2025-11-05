'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import DailyLeaderboard from './DailyLeaderboard';
import StreakLeaderboard from './StreakLeaderboard';

/**
 * LeaderboardModal - Main leaderboard modal component
 *
 * Displays both daily speed leaderboards and all-time streak leaderboards
 * for both Tandem Daily and Daily Cryptic games
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal closes
 * @param {string} gameType - 'tandem' or 'cryptic'
 * @param {string} initialTab - 'daily' or 'streak' (default: 'daily')
 */
export default function LeaderboardModal({
  isOpen,
  onClose,
  gameType = 'tandem',
  initialTab = 'daily',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { highContrast } = useTheme();

  if (!isOpen) return null;

  const gameName = gameType === 'tandem' ? 'Tandem Daily' : 'Daily Cryptic';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-bg-card rounded-[32px] border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${
          highContrast ? 'border-hc-border' : 'border-border-main'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-[3px] border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Leaderboard</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{gameName}</p>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === 'daily'
                ? highContrast
                  ? 'bg-hc-primary text-white border-b-[3px] border-hc-border'
                  : 'bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 border-b-[3px] border-sky-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('streak')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeTab === 'streak'
                ? highContrast
                  ? 'bg-hc-primary text-white border-b-[3px] border-hc-border'
                  : 'bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 border-b-[3px] border-sky-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            Best Streaks
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scrollbar">
          {activeTab === 'daily' ? (
            <DailyLeaderboard gameType={gameType} />
          ) : (
            <StreakLeaderboard gameType={gameType} />
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
            {activeTab === 'daily'
              ? 'Rankings based on completion time'
              : 'All-time best streaks • Compete with players worldwide'}
          </p>
        </div>
      </div>
    </div>
  );
}
