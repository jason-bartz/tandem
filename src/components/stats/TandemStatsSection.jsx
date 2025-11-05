'use client';

import { useState } from 'react';
import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';

/**
 * TandemStatsSection - Displays Tandem Daily stats
 * Reuses existing Tandem stats structure and colors (BLUE theme)
 *
 * @param {Object} stats - Tandem stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function TandemStatsSection({ stats, animationKey }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();
  // Calculate win rate
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  // Animated counter values
  const animatedPlayed = useCounterAnimation(stats.played, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.bestStreak, animationKey);
  const animatedWinRate = useCounterAnimation(winRate, animationKey);

  return (
    <>
      <StatsSection
        title="Tandem Daily"
        icon="/icons/ui/emoji-inter.png"
        iconDark="/icons/ui/emoji-inter-dark.png"
        themeColor="blue"
      >
        {/* All Stats in a Row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <StatCard value={animatedPlayed} label="Played" />
          <StatCard value={`${animatedWinRate}%`} label="Win Rate" />
          <StatCard
            value={animatedCurrentStreak}
            label="Current Streak"
            emoji={getStreakMilestone(stats.currentStreak)}
          />
          <StatCard value={animatedBestStreak} label="Best Streak" />
        </div>

        {/* Leaderboard Button */}
        <button
          onClick={() => {
            lightTap();
            setShowLeaderboard(true);
          }}
          className={`w-full py-3 px-4 rounded-xl border-[3px] font-semibold text-sm transition-all flex items-center justify-center ${
            highContrast
              ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-sky-700 text-white border-black dark:border-gray-800 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
          }`}
        >
          View Leaderboard
        </button>
      </StatsSection>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="tandem"
        initialTab="daily"
      />
    </>
  );
}
