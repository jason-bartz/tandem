'use client';

import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';

/**
 * TandemStatsSection - Displays Daily Tandem stats
 * Reuses existing Tandem stats structure and colors (BLUE theme)
 *
 * @param {Object} stats - Tandem stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function TandemStatsSection({ stats, animationKey }) {
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  // Animated counter values
  const animatedPlayed = useCounterAnimation(stats.played, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.bestStreak, animationKey);
  const animatedWinRate = useCounterAnimation(winRate, animationKey);

  return (
    <StatsSection title="Daily Tandem" icon="/ui/games/tandem.png" themeColor="blue">
      {/* All Stats in a Row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard value={animatedPlayed} label="Played" />
        <StatCard value={`${animatedWinRate}%`} label="Win Rate" />
        <StatCard
          value={animatedCurrentStreak}
          label="Current Streak"
          emoji={getStreakMilestone(stats.currentStreak)}
        />
        <StatCard value={animatedBestStreak} label="Best Streak" />
      </div>
    </StatsSection>
  );
}
