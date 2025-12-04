'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import DailyLeaderboard from './DailyLeaderboard';
import StreakLeaderboard from './StreakLeaderboard';

/**
 * LeaderboardModal - Main leaderboard left panel component
 *
 * Displays both daily speed leaderboards and all-time streak leaderboards
 * for Daily Tandem and Daily Mini games
 *
 * @param {boolean} isOpen - Whether the panel is open
 * @param {function} onClose - Callback when panel closes
 * @param {string} gameType - 'tandem' or 'mini'
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

  const gameName = gameType === 'tandem' ? 'Daily Tandem' : 'Daily Mini';

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Leaderboard"
      maxWidth="550px"
      headerClassName="border-b-0"
      contentClassName="p-0"
      footer={
        <p className="text-xs text-center text-gray-600 dark:text-gray-400">
          {activeTab === 'daily'
            ? 'Rankings based on completion time'
            : 'All-time best streaks • Compete with players worldwide'}
        </p>
      }
    >
      {/* Subtitle under title */}
      <div className="px-6 pt-2 pb-4 border-b-[3px] border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">{gameName}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 px-6 py-4 font-semibold transition-all ${
            activeTab === 'daily'
              ? highContrast
                ? 'bg-hc-primary text-white border-b-[3px] border-hc-border'
                : 'bg-ghost-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 border-b-[3px] border-sky-500'
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
                : 'bg-ghost-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 border-b-[3px] border-sky-500'
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
    </LeftSidePanel>
  );
}
