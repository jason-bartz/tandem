'use client';
import { useEffect, useState } from 'react';
import { loadStats } from '@/lib/storage';
import { getStreakMilestone } from '@/lib/streakMilestones';
import ShareButton from './ShareButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useCounterAnimation } from '@/hooks/useAnimation';

export default function StatsModal({ isOpen, onClose }) {
  const { highContrast, reduceMotion } = useTheme();
  const [stats, setStats] = useState({
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [animationKey, setAnimationKey] = useState(0);

  // Calculate win rate
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  // Animated counter values
  const animatedPlayed = useCounterAnimation(stats.played);
  const animatedWins = useCounterAnimation(stats.wins);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak);
  const animatedBestStreak = useCounterAnimation(stats.bestStreak);
  const animatedWinRate = useCounterAnimation(winRate);

  useEffect(() => {
    if (isOpen !== false) {
      loadStats().then(setStats);
      // Increment animation key to force re-animation
      setAnimationKey((prev) => prev + 1);
    }
  }, [isOpen]);

  if (isOpen === false) {
    return null;
  }

  // Generate shareable stats text
  const shareableStatsText = `My Tandem Stats
═══════════════
Current Streak: ${stats.currentStreak} ${stats.currentStreak > 0 ? '🔥' : ''}
Best Streak: ${stats.bestStreak}
Total Solved: ${stats.wins}
Completion: ${winRate}%
═══════════════
#TandemPuzzle`;

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-5 animate-backdrop-enter gpu-accelerated"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full animate-modal-enter shadow-2xl gpu-accelerated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">Statistics</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full border-none text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-2 border-hc-border hover:bg-hc-primary hover:text-white font-bold'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6" key={`stats-grid-${animationKey}`}>
          <div
            className={`p-4 rounded-xl text-center ${
              highContrast
                ? 'bg-hc-surface border-2 border-hc-border'
                : 'bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900'
            }`}
          >
            <div
              className={`text-3xl font-extrabold ${
                highContrast
                  ? 'text-hc-primary'
                  : 'bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent'
              } ${!reduceMotion ? 'animate-count-up' : ''}`}
            >
              {animatedPlayed}
            </div>
            <div
              className={`text-xs mt-1 uppercase tracking-wide ${
                highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Played
            </div>
          </div>
          <div
            className={`p-4 rounded-xl text-center ${
              highContrast
                ? 'bg-hc-surface border-2 border-hc-border'
                : 'bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900'
            }`}
          >
            <div
              className={`text-3xl font-extrabold ${
                highContrast
                  ? 'text-hc-primary'
                  : 'bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent'
              } ${!reduceMotion ? 'animate-count-up' : ''}`}
            >
              {animatedWinRate}%
            </div>
            <div
              className={`text-xs mt-1 uppercase tracking-wide ${
                highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Win Rate
            </div>
          </div>
          <div
            className={`p-4 rounded-xl text-center ${
              highContrast
                ? 'bg-hc-surface border-2 border-hc-border'
                : 'bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900'
            }`}
          >
            <div className="text-3xl font-extrabold">
              <span
                className={`${
                  highContrast
                    ? 'text-hc-primary'
                    : 'bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent'
                } ${!reduceMotion ? 'animate-count-up' : ''}`}
              >
                {animatedCurrentStreak}
              </span>{' '}
              <span className="text-3xl">{getStreakMilestone(stats.currentStreak)}</span>
            </div>
            <div
              className={`text-xs mt-1 uppercase tracking-wide ${
                highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Current Streak
            </div>
          </div>
          <div
            className={`p-4 rounded-xl text-center ${
              highContrast
                ? 'bg-hc-surface border-2 border-hc-border'
                : 'bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900'
            }`}
          >
            <div
              className={`text-3xl font-extrabold ${
                highContrast
                  ? 'text-hc-primary'
                  : 'bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent'
              } ${!reduceMotion ? 'animate-count-up' : ''}`}
            >
              {animatedBestStreak}
            </div>
            <div
              className={`text-xs mt-1 uppercase tracking-wide ${
                highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Best Streak
            </div>
          </div>
        </div>

        <div
          key={`total-wins-${animationKey}`}
          className={`p-4 rounded-xl text-center ${
            highContrast
              ? 'bg-hc-surface border-2 border-hc-border'
              : 'bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900 dark:to-teal-900'
          }`}
        >
          <div
            className={`text-3xl font-extrabold ${
              highContrast
                ? 'text-hc-primary'
                : 'bg-gradient-to-r from-sky-600 to-teal-500 bg-clip-text text-transparent'
            } ${!reduceMotion ? 'animate-count-up' : ''}`}
          >
            {animatedWins}
          </div>
          <div
            className={`text-xs mt-1 uppercase tracking-wide ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Total Wins
          </div>
        </div>

        <div className="mt-6">
          <ShareButton shareText={shareableStatsText} className="w-full" />
        </div>
      </div>
    </div>
  );
}
