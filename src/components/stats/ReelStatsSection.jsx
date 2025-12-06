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
 * ReelStatsSection - Displays Reel Connections stats
 * Uses RED theme to match Reel Connections branding
 *
 * @param {Object} stats - Reel stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function ReelStatsSection({ stats, animationKey }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  // Animated counter values
  const animatedPlayed = useCounterAnimation(stats.gamesPlayed || 0, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak || 0, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.bestStreak || 0, animationKey);
  const animatedWinRate = useCounterAnimation(winRate, animationKey);

  return (
    <>
      <StatsSection title="Reel Connections" icon="/icons/ui/movie.png" themeColor="red">
        {/* All Stats in a Row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <StatCard value={animatedPlayed} label="Played" />
          <StatCard value={`${animatedWinRate}%`} label="Win Rate" />
          <StatCard
            value={animatedCurrentStreak}
            label="Current Streak"
            emoji={getStreakMilestone(stats.currentStreak || 0)}
          />
          <StatCard value={animatedBestStreak} label="Best Streak" />
        </div>

        {/* Leaderboard Button */}
        <button
          onClick={() => {
            lightTap();
            setShowLeaderboard(true);
          }}
          className={`w-full py-3 px-4 rounded-[20px] border-[3px] font-semibold text-sm transition-all flex items-center justify-center ${
            highContrast
              ? 'bg-hc-primary text-hc-text border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-red-700 text-white border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000]'
          }`}
        >
          View Leaderboard
        </button>
      </StatsSection>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="reel"
        initialTab="daily"
      />
    </>
  );
}
