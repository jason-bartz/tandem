'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import useUnifiedStats from '@/hooks/useUnifiedStats';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import TandemStatsSection from './TandemStatsSection';
import MiniStatsSection from './MiniStatsSection';
import ReelStatsSection from './ReelStatsSection';
import SoupStatsSection from './SoupStatsSection';
import AchievementsModal from '../achievements/AchievementsModal';
import StatsModalSkeleton from '@/components/shared/StatsModalSkeleton';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * UnifiedStatsModal - Unified statistics left panel for all games
 * Displays Daily Tandem, Daily Mini, Daily Alchemy, and Reel Connections stats in a single panel
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
  const { tandemStats, miniStats, reelStats, soupStats, loading, error } = useUnifiedStats(isOpen);

  // Trigger re-animation when modal opens
  useEffect(() => {
    if (isOpen !== false) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [isOpen]);

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
      >
        {/* Loading State */}
        {loading && <StatsModalSkeleton />}

        {/* Error State */}
        {error && !loading && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              highContrast ? 'bg-hc-surface' : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <p
              className={`text-center mb-3 ${
                highContrast ? 'text-hc-text' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className={`w-full py-2 rounded-md font-semibold text-sm transition-all ${
                highContrast
                  ? 'bg-hc-primary text-hc-text'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
              }`}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Stats Sections */}
        {!loading && !error && (
          <>
            {/* Empty state for new users */}
            {(() => {
              const hasAnyStats = [tandemStats, miniStats, soupStats, reelStats].some(
                (s) => s && (s.played > 0 || s.gamesPlayed > 0)
              );
              if (!hasAnyStats) {
                return (
                  <div className="text-center py-8">
                    <p
                      className={`text-lg font-bold mb-2 ${
                        highContrast ? 'text-hc-text' : 'text-text-primary'
                      }`}
                    >
                      No stats yet!
                    </p>
                    <p
                      className={`text-sm ${
                        highContrast ? 'text-hc-text opacity-70' : 'text-text-secondary'
                      }`}
                    >
                      Play a game to start tracking your progress.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {!isStandaloneAlchemy && (
              <>
                <TandemStatsSection stats={tandemStats} animationKey={animationKey} />
                <MiniStatsSection stats={miniStats} animationKey={animationKey} />
              </>
            )}
            <SoupStatsSection stats={soupStats} animationKey={animationKey} />
            {!isStandaloneAlchemy && (
              <ReelStatsSection stats={reelStats} animationKey={animationKey} />
            )}

            {/* Action Buttons - scrollable with content (achievements hidden on standalone) */}
            {!isStandaloneAlchemy && (
              <div className="space-y-2 mt-4 pb-4">
                {/* Achievements Button */}
                <button
                  onClick={handleOpenAchievements}
                  className={`w-full py-3 px-4 rounded-md font-semibold transition-all duration-200 flex items-center justify-center hover:scale-105 ${
                    highContrast
                      ? 'bg-hc-primary text-hc-text hover:bg-hc-primary/90'
                      : 'bg-bg-surface text-text-primary dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  View Achievements
                </button>
              </div>
            )}
          </>
        )}
      </LeftSidePanel>

      {/* Nested Achievements Panel - Opens over stats panel */}
      <AchievementsModal isOpen={showAchievements} onClose={handleCloseAchievements} />
    </>
  );
}
