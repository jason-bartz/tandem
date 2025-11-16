'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import useAchievementStatus from '@/hooks/useAchievementStatus';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import AchievementCard from './AchievementCard';
import AchievementsModalSkeleton from '@/components/shared/AchievementsModalSkeleton';

/**
 * AchievementsModal - Display all achievements left panel with filtering
 * Shows user's achievement progress with tabs for Daily Tandem/Daily Cryptic
 *
 * @param {boolean} isOpen - Whether the panel is open
 * @param {Function} onClose - Callback to close the panel
 */
export default function AchievementsModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();
  const [activeTab, setActiveTab] = useState('tandem');

  // Load achievement status for both game modes
  const tandemStatus = useAchievementStatus(isOpen, 'tandem');
  const crypticStatus = useAchievementStatus(isOpen, 'cryptic');

  // Get data based on active tab
  const getDisplayData = () => {
    switch (activeTab) {
      case 'cryptic':
        return crypticStatus.achievementData;
      default:
        return tandemStatus.achievementData;
    }
  };

  const displayData = getDisplayData();
  const loading = activeTab === 'tandem' ? tandemStatus.loading : crypticStatus.loading;
  const error = activeTab === 'tandem' ? tandemStatus.error : crypticStatus.error;

  const handleClose = () => {
    lightTap();
    onClose();
  };

  const handleTabChange = (tab) => {
    lightTap();
    setActiveTab(tab);
  };

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Achievements"
      maxWidth="550px"
      contentClassName="px-6 py-4"
      zIndex={60}
    >
      {/* Loading State */}
      {loading && <AchievementsModalSkeleton />}

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

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary Stats */}
          <div
            className={`rounded-2xl border-[3px] p-4 mb-4 ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            <div className="flex justify-around items-center">
              <div className="text-center">
                <div className="text-3xl font-extrabold mb-1">
                  {displayData.unlockedCount}/{displayData.totalCount}
                </div>
                <div className="text-xs uppercase tracking-wide font-medium opacity-90">
                  Unlocked
                </div>
              </div>
              <div className="w-px h-12 bg-white/30"></div>
              <div className="text-center">
                <div className="text-3xl font-extrabold mb-1">
                  {displayData.unlockedCount > 0
                    ? Math.round((displayData.unlockedCount / displayData.totalCount) * 100)
                    : 0}
                  %
                </div>
                <div className="text-xs uppercase tracking-wide font-medium opacity-90">
                  Complete
                </div>
              </div>
            </div>
          </div>

          {/* Tab Filters */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleTabChange('tandem')}
              className={`flex-1 py-2 px-4 rounded-xl border-[2px] font-bold text-sm transition-all ${
                activeTab === 'tandem'
                  ? highContrast
                    ? 'bg-hc-primary text-hc-text border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-accent-blue text-white border-accent-blue shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.4)]'
                  : highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-surface/80'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Daily Tandem ({tandemStatus.achievementData.totalCount})
            </button>
            <button
              onClick={() => handleTabChange('cryptic')}
              className={`flex-1 py-2 px-4 rounded-xl border-[2px] font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'cryptic'
                  ? highContrast
                    ? 'bg-hc-primary text-hc-text border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-purple-600 text-white border-purple-600 shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.4)]'
                  : highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-surface/80'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Daily Cryptic ({crypticStatus.achievementData.totalCount})
            </button>
          </div>

          {/* Achievement Grid */}
          <div className="space-y-3">
            {displayData.allAchievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No achievements in this category yet.
              </div>
            ) : (
              displayData.allAchievements.map((achievement, index) => (
                <AchievementCard key={achievement.id} achievement={achievement} index={index} />
              ))
            )}
          </div>
        </>
      )}
    </LeftSidePanel>
  );
}
