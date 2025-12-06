'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import useUnifiedStats from '@/hooks/useUnifiedStats';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import TandemStatsSection from './TandemStatsSection';
import MiniStatsSection from './MiniStatsSection';
import ReelStatsSection from './ReelStatsSection';
import ShareButton from '../game/ShareButton';
import AchievementsModal from '../achievements/AchievementsModal';
import StatsModalSkeleton from '@/components/shared/StatsModalSkeleton';

/**
 * UnifiedStatsModal - Unified statistics left panel for all games
 * Displays Daily Tandem, Daily Mini, and Reel Connections stats in a single panel
 *
 * @param {boolean} isOpen - Whether the panel is open
 * @param {Function} onClose - Callback to close the panel
 */
export default function UnifiedStatsModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();
  const [animationKey, setAnimationKey] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);

  // Load stats for all games
  const { tandemStats, miniStats, reelStats, loading, error } = useUnifiedStats(isOpen);

  // Trigger re-animation when modal opens
  useEffect(() => {
    if (isOpen !== false) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [isOpen]);

  // Generate shareable stats text
  const reelWinRate =
    reelStats.gamesPlayed > 0 ? Math.round((reelStats.gamesWon / reelStats.gamesPlayed) * 100) : 0;
  const shareableStatsText = `My Tandem Daily Games Stats 🚲
═══════════════════════

🚲 Daily Tandem
Played: ${tandemStats.played} | Win Rate: ${tandemStats.played > 0 ? Math.round((tandemStats.wins / tandemStats.played) * 100) : 0}%
Current Streak: ${tandemStats.currentStreak} ${tandemStats.currentStreak > 0 ? '🔥' : ''}

📝 Daily Mini
Played: ${miniStats.totalCompleted} | Best Streak: ${miniStats.longestStreak || 0}
Current Streak: ${miniStats.currentStreak} ${miniStats.currentStreak > 0 ? '🔥' : ''}

🎬 Reel Connections
Played: ${reelStats.gamesPlayed} | Win Rate: ${reelWinRate}%
Current Streak: ${reelStats.currentStreak} ${reelStats.currentStreak > 0 ? '🔥' : ''}

Play at tandemdaily.com
#TandemDailyGames`;

  const handleClose = () => {
    lightTap();
    onClose();
  };

  const handleOpenAchievements = () => {
    lightTap();
    setShowAchievements(true);
  };

  const handleCloseAchievements = () => {
    setShowAchievements(false);
  };

  return (
    <>
      <LeftSidePanel
        isOpen={isOpen}
        onClose={handleClose}
        title="Statistics"
        maxWidth="480px"
        contentClassName="px-6 py-4"
        footer={
          !loading && !error ? (
            <div className="space-y-2">
              {/* Achievements Button */}
              <button
                onClick={handleOpenAchievements}
                className={`w-full py-3 px-4 rounded-[20px] border-[3px] font-semibold transition-all flex items-center justify-center ${
                  highContrast
                    ? 'bg-hc-primary text-hc-text border-hc-border hover:bg-hc-primary/90 shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }`}
              >
                View Achievements
              </button>

              {/* Share Button */}
              <ShareButton shareText={shareableStatsText} className="w-full" />
            </div>
          ) : null
        }
      >
        {/* Loading State */}
        {loading && <StatsModalSkeleton />}

        {/* Error State */}
        {error && !loading && (
          <div
            className={`p-4 rounded-2xl border-[3px] mb-4 ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }`}
          >
            <p
              className={`text-center ${
                highContrast ? 'text-hc-text' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {error}
            </p>
          </div>
        )}

        {/* Stats Sections */}
        {!loading && !error && (
          <>
            <TandemStatsSection stats={tandemStats} animationKey={animationKey} />
            <MiniStatsSection stats={miniStats} animationKey={animationKey} />
            <ReelStatsSection stats={reelStats} animationKey={animationKey} />
          </>
        )}
      </LeftSidePanel>

      {/* Nested Achievements Panel - Opens over stats panel */}
      <AchievementsModal isOpen={showAchievements} onClose={handleCloseAchievements} />
    </>
  );
}
