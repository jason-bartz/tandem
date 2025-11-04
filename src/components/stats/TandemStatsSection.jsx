'use client';

import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';

/**
 * TandemStatsSection - Displays Tandem Daily stats
 * Reuses existing Tandem stats structure and colors
 *
 * @param {Object} stats - Tandem stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function TandemStatsSection({ stats, animationKey }) {
  // Calculate win rate
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  // Animated counter values
  const animatedPlayed = useCounterAnimation(stats.played, animationKey);
  const animatedWins = useCounterAnimation(stats.wins, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.bestStreak, animationKey);
  const animatedWinRate = useCounterAnimation(winRate, animationKey);

  return (
    <StatsSection
      title="Tandem Daily"
      icon="/icons/ui/emoji-inter.png"
      iconDark="/icons/ui/emoji-inter-dark.png"
    >
      {/* Top Row: Played + Win Rate */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard value={animatedPlayed} label="Played" color="blue" />
        <StatCard value={`${animatedWinRate}%`} label="Win Rate" color="green" />
      </div>

      {/* Bottom Row: Current Streak + Best Streak */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          value={animatedCurrentStreak}
          label="Current Streak"
          color="yellow"
          emoji={getStreakMilestone(stats.currentStreak)}
        />
        <StatCard value={animatedBestStreak} label="Best Streak" color="pink" />
      </div>
    </StatsSection>
  );
}
