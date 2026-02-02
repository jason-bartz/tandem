'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import DailyLeaderboard from './DailyLeaderboard';
import StreakLeaderboard from './StreakLeaderboard';

/**
 * LeaderboardModal - Main leaderboard left panel component
 *
 * Displays both daily speed leaderboards and all-time streak leaderboards
 * for all four games with toggle buttons
 *
 * @param {boolean} isOpen - Whether the panel is open
 * @param {function} onClose - Callback when panel closes
 * @param {string} initialGame - 'tandem', 'mini', 'soup', or 'reel' (default: 'tandem')
 * @param {string} initialTab - 'daily' or 'streak' (default: 'daily')
 */
export default function LeaderboardModal({
  isOpen,
  onClose,
  gameType = 'tandem',
  initialGame,
  initialTab = 'daily',
}) {
  // Use initialGame if provided, otherwise fall back to gameType for backwards compatibility
  const [activeGame, setActiveGame] = useState(initialGame || gameType);
  const [activeTab, setActiveTab] = useState(initialTab);
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

  // Reset to initial game when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveGame(initialGame || gameType);
    }
  }, [isOpen, initialGame, gameType]);

  const gameButtons = [
    {
      id: 'tandem',
      label: 'Tandem',
      bgColor: 'bg-sky-500',
      hcBgColor: 'bg-hc-primary',
      textColor: 'text-white',
    },
    {
      id: 'mini',
      label: 'Mini',
      bgColor: 'bg-yellow-500',
      hcBgColor: 'bg-hc-warning',
      textColor: 'text-gray-900',
    },
    {
      id: 'soup',
      label: 'Alchemy',
      bgColor: 'bg-soup-primary',
      hcBgColor: 'bg-hc-success',
      textColor: 'text-white',
    },
    {
      id: 'reel',
      label: 'Reels',
      bgColor: 'bg-red-500',
      hcBgColor: 'bg-hc-error',
      textColor: 'text-white',
    },
  ];

  const handleGameChange = (gameId) => {
    lightTap();
    setActiveGame(gameId);
  };

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
      {/* Game Toggle Buttons */}
      <div className="px-4 py-3 border-b-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex gap-2">
          {gameButtons.map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameChange(game.id)}
              className={`flex-1 py-2 px-2 rounded-xl border-[2px] font-bold text-xs transition-all ${
                activeGame === game.id
                  ? highContrast
                    ? `${game.hcBgColor} text-hc-text border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]`
                    : `${game.bgColor} ${game.textColor} border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]`
                  : highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              {game.label}
            </button>
          ))}
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
          <DailyLeaderboard gameType={activeGame} />
        ) : (
          <StreakLeaderboard gameType={activeGame} />
        )}
      </div>
    </LeftSidePanel>
  );
}
