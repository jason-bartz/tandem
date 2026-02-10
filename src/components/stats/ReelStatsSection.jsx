'use client';

import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';

/**
 * ReelStatsSection - Displays Reel Connections stats
 * Uses RED theme to match Reel Connections branding
 *
 * @param {Object} stats - Reel stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function ReelStatsSection({ stats, animationKey }) {
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  // Animated counter values
  const animatedPlayed = useCounterAnimation(stats.gamesPlayed || 0, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak || 0, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.bestStreak || 0, animationKey);
  const animatedWinRate = useCounterAnimation(winRate, animationKey);

  return (
    <StatsSection title="Reel Connections" icon="/ui/games/movie.png" themeColor="red">
      {/* All Stats in a Row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard value={animatedPlayed} label="Played" />
        <StatCard value={`${animatedWinRate}%`} label="Win Rate" />
        <StatCard
          value={animatedCurrentStreak}
          label="Current Streak"
          emoji={getStreakMilestone(stats.currentStreak || 0)}
        />
        <StatCard value={animatedBestStreak} label="Best Streak" />
      </div>
    </StatsSection>
  );
}
