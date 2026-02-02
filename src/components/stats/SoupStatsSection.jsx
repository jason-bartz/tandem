'use client';

import { useState } from 'react';
import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import FirstDiscoveriesModal from '@/components/daily-alchemy/FirstDiscoveriesModal';
import { ASSET_VERSION } from '@/lib/constants';

/**
 * SoupStatsSection - Displays Daily Alchemy stats
 * Uses GREEN theme to match Daily Alchemy branding
 *
 * @param {Object} stats - Soup stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function SoupStatsSection({ stats, animationKey }) {
  const [showFirstDiscoveries, setShowFirstDiscoveries] = useState(false);
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

  // Format average time (seconds to MM:SS)
  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animated counter values
  const animatedCompleted = useCounterAnimation(stats.totalCompleted || 0, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak || 0, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.longestStreak || 0, animationKey);

  return (
    <>
      <StatsSection
        title="Daily Alchemy"
        icon={`/icons/ui/daily-alchemy.png?v=${ASSET_VERSION}`}
        themeColor="green"
      >
        {/* All Stats in a Row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <StatCard value={animatedCompleted} label="Played" />
          <StatCard
            value={formatTime(stats.averageTime || 0)}
            label="Average Time"
            animate={false}
          />
          <StatCard
            value={animatedCurrentStreak}
            label="Current Streak"
            emoji={getStreakMilestone(stats.currentStreak || 0)}
          />
          <StatCard value={animatedBestStreak} label="Best Streak" />
        </div>

        {/* Discoveries Button */}
        <button
          onClick={() => {
            lightTap();
            setShowFirstDiscoveries(true);
          }}
          className={`w-full py-3 px-4 rounded-[20px] border-[3px] font-semibold text-sm transition-all flex items-center justify-center ${
            highContrast
              ? 'bg-hc-primary text-hc-text border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-soup-primary dark:bg-soup-hover text-white border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000]'
          }`}
        >
          View Discoveries
        </button>
      </StatsSection>

      {/* First Discoveries Modal */}
      <FirstDiscoveriesModal
        isOpen={showFirstDiscoveries}
        onClose={() => setShowFirstDiscoveries(false)}
      />
    </>
  );
}
