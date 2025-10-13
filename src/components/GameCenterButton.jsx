'use client';
import { useState, useEffect } from 'react';
import gameCenterService from '@/services/gameCenter.service';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

export default function GameCenterButton() {
  const [isAvailable, setIsAvailable] = useState(false);
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

  useEffect(() => {
    // Check if Game Center is available
    setIsAvailable(gameCenterService.isAvailable());
  }, []);

  const handleShowAchievements = async () => {
    lightTap();
    await gameCenterService.showAchievements();
  };

  const handleShowLeaderboard = async () => {
    lightTap();
    await gameCenterService.showLeaderboard();
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Game Center
      </h3>

      <button
        onClick={handleShowAchievements}
        className={`
          w-full py-3 px-4 rounded-xl font-semibold
          transition-all flex items-center justify-between
          ${
            highContrast
              ? 'bg-hc-surface border-2 border-hc-border text-hc-text hover:bg-hc-focus'
              : 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-gray-800 dark:text-gray-200 hover:from-amber-200 hover:to-yellow-200 dark:hover:from-amber-800/50 dark:hover:to-yellow-800/50'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span>View Achievements</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">›</span>
      </button>

      <button
        onClick={handleShowLeaderboard}
        className={`
          w-full py-3 px-4 rounded-xl font-semibold
          transition-all flex items-center justify-between
          ${
            highContrast
              ? 'bg-hc-surface border-2 border-hc-border text-hc-text hover:bg-hc-focus'
              : 'bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900/40 dark:to-teal-900/40 text-gray-800 dark:text-gray-200 hover:from-sky-200 hover:to-teal-200 dark:hover:from-sky-800/50 dark:hover:to-teal-800/50'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <span>View Leaderboard</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">›</span>
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
        Track your progress and compete with other players through Game Center.
      </p>
    </div>
  );
}
