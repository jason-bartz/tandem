'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import useAchievementStatus from '@/hooks/useAchievementStatus';
import AchievementCard from './AchievementCard';

/**
 * AchievementsModal - Display all achievements with filtering
 * Shows user's achievement progress with tabs for Tandem Daily/Daily Cryptic
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
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

  if (isOpen === false) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-5 animate-backdrop-enter gpu-accelerated"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-bg-card rounded-[32px] border-[3px] border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar animate-modal-enter gpu-accelerated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">Achievements</h2>
          <button
            onClick={handleClose}
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-accent-blue rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Loading achievements...</p>
          </div>
        )}

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
                Tandem Daily ({tandemStatus.achievementData.totalCount})
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
                displayData.allAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
