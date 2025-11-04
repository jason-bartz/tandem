'use client';

import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';

/**
 * CrypticStatsSection - Displays Daily Cryptic stats
 * Uses purple theme to match Daily Cryptic branding
 *
 * @param {Object} stats - Cryptic stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function CrypticStatsSection({ stats, animationKey }) {
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
  const animatedPerfectSolves = useCounterAnimation(stats.perfectSolves || 0, animationKey);

  return (
    <StatsSection
      title="Daily Cryptic"
      icon="/icons/ui/cryptic.png"
      iconDark="/icons/ui/cryptic-dark.png"
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
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          value={animatedCurrentStreak}
          label="Current Streak"
          color="yellow"
          emoji={getStreakMilestone(stats.currentStreak || 0)}
        />
        <StatCard value={animatedLongestStreak} label="Best Streak" color="pink" />
      </div>
    </StatsSection>
  );
}
