'use client';
import { useState, useEffect } from 'react';
import gameCenterService from '@/services/gameCenter.service';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useHaptics } from '@/hooks/useHaptics';

export default function GameCenterButton() {
  const [isAvailable, setIsAvailable] = useState(false);
  const { highContrast } = useTheme();
  const getIconPath = useUIIcon();
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
          w-full py-3 px-4 rounded-2xl font-semibold
          transition-all flex items-center justify-between
          ${
            highContrast
              ? 'bg-hc-surface border-[3px] border-hc-border text-hc-text hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-accent-yellow/20 dark:bg-amber-900/40 border-[3px] border-accent-yellow dark:border-gray-600 text-gray-800 dark:text-gray-200 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <img src={getIconPath('achievements')} alt="Achievements" className="w-5 h-5" />
          <span>View Achievements</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">›</span>
      </button>

      <button
        onClick={handleShowLeaderboard}
        className={`
          w-full py-3 px-4 rounded-2xl font-semibold
          transition-all flex items-center justify-between
          ${
            highContrast
              ? 'bg-hc-surface border-[3px] border-hc-border text-hc-text hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-accent-blue/20 dark:bg-sky-900/40 border-[3px] border-accent-blue dark:border-gray-600 text-gray-800 dark:text-gray-200 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <img src={getIconPath('leaderboard')} alt="Leaderboard" className="w-5 h-5" />
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
