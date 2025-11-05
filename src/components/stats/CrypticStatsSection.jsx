'use client';

import { useState } from 'react';
import Image from 'next/image';
import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';

/**
 * CrypticStatsSection - Displays Daily Cryptic stats
 * Uses PURPLE theme to match Daily Cryptic branding
 *
 * @param {Object} stats - Cryptic stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function CrypticStatsSection({ stats, animationKey }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { theme, highContrast } = useTheme();
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
  const animatedLongestStreak = useCounterAnimation(stats.longestStreak || 0, animationKey);

  return (
    <>
      <StatsSection
        title="Daily Cryptic"
        icon="/icons/ui/cryptic.png"
        iconDark="/icons/ui/cryptic-dark.png"
        themeColor="purple"
      >
        {/* Top Row: Played + Average Time */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard value={animatedCompleted} label="Played" color="blue" />
          <StatCard
            value={formatTime(stats.averageTime || 0)}
            label="Average Time"
            color="purple"
            animate={false}
          />
        </div>

        {/* Bottom Row: Current Streak + Best Streak */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <StatCard
            value={animatedCurrentStreak}
            label="Current Streak"
            color="yellow"
            emoji={getStreakMilestone(stats.currentStreak || 0)}
          />
          <StatCard value={animatedLongestStreak} label="Best Streak" color="pink" />
        </div>

        {/* Leaderboard Button */}
        <button
          onClick={() => {
            lightTap();
            setShowLeaderboard(true);
          }}
          className={`w-full py-3 px-4 rounded-xl border-[3px] font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            highContrast
              ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-purple-600 text-white border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
          }`}
        >
          <Image
            src={theme === 'dark' ? '/icons/ui/leaderboard-dark.png' : '/icons/ui/leaderboard.png'}
            alt=""
            width={20}
            height={20}
          />
          View Leaderboard
        </button>
      </StatsSection>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="cryptic"
        initialTab="daily"
      />
    </>
  );
}
