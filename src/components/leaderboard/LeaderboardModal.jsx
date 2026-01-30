'use client';

import { useState } from 'react';
import Image from 'next/image';
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

  const gameConfig = {
    tandem: {
      name: 'Daily Tandem',
      icon: '/icons/ui/tandem.png',
      bgColor: 'bg-sky-400/30 dark:bg-sky-400/30',
      hcBgColor: 'bg-hc-primary/20',
    },
    mini: {
      name: 'Daily Mini',
      icon: '/icons/ui/mini.png',
      bgColor: 'bg-yellow-400/30 dark:bg-yellow-400/30',
      hcBgColor: 'bg-hc-warning/20',
    },
    reel: {
      name: 'Reel Connections',
      icon: '/icons/ui/movie.png',
      bgColor: 'bg-red-500/30 dark:bg-red-500/30',
      hcBgColor: 'bg-hc-error/20',
    },
    'reel-connections': {
      name: 'Reel Connections',
      icon: '/icons/ui/movie.png',
      bgColor: 'bg-red-500/30 dark:bg-red-500/30',
      hcBgColor: 'bg-hc-error/20',
    },
    soup: {
      name: 'Daily Alchemy',
      icon: '/icons/ui/daily-alchemy.png',
      bgColor: 'bg-green-500/30 dark:bg-green-500/30',
      hcBgColor: 'bg-hc-success/20',
    },
  };
  const config = gameConfig[gameType] || gameConfig.mini;

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
      {/* Game name header with icon */}
      <div
        className={`px-6 py-3 border-b-[3px] border-gray-200 dark:border-gray-700 ${
          highContrast ? config.hcBgColor : config.bgColor
        }`}
      >
        <div className="flex items-center gap-2">
          <Image src={config.icon} alt="" width={20} height={20} />
          <p
            className={`text-sm font-semibold ${
              highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {config.name}
          </p>
        </div>
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
