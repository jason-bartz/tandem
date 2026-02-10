'use client';

import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';

/**
 * MiniStatsSection - Displays Daily Mini stats
 * Uses YELLOW theme to match Daily Mini branding
 *
 * @param {Object} stats - Mini stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function MiniStatsSection({ stats, animationKey }) {
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
    <StatsSection title="Daily Mini" icon="/ui/games/mini.png" themeColor="yellow">
      {/* All Stats in a Row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard value={animatedCompleted} label="Played" />
        <StatCard value={formatTime(stats.averageTime || 0)} label="Average Time" animate={false} />
        <StatCard
          value={animatedCurrentStreak}
          label="Current Streak"
          emoji={getStreakMilestone(stats.currentStreak || 0)}
        />
        <StatCard value={animatedLongestStreak} label="Best Streak" />
      </div>
    </StatsSection>
  );
}
