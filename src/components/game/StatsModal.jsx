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
        className="bg-white dark:bg-bg-card rounded-[32px] border-[3px] border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-scrollbar animate-modal-enter gpu-accelerated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">Statistics</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4" key={`stats-grid-${animationKey}`}>
          <div
            className={`p-4 rounded-2xl text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-accent-blue/20 dark:bg-sky-900/40 border-accent-blue'
            }`}
          >
            <div
              className={`text-3xl font-extrabold ${
                highContrast ? 'text-hc-primary' : 'text-accent-blue dark:text-accent-blue'
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
            className={`p-4 rounded-2xl text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(126,217,87,0.3)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-accent-green/20 dark:bg-green-900/40 border-accent-green'
            }`}
          >
            <div
              className={`text-3xl font-extrabold ${
                highContrast ? 'text-hc-primary' : 'text-accent-green dark:text-accent-green'
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
            className={`p-4 rounded-2xl text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-accent-yellow/20 dark:bg-yellow-900/40 border-accent-yellow'
            }`}
          >
            <div className="text-3xl font-extrabold">
              <span
                className={`${
                  highContrast ? 'text-hc-primary' : 'text-accent-yellow dark:text-accent-yellow'
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
            className={`p-4 rounded-2xl text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(255,102,196,0.3)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-accent-pink/20 dark:bg-pink-900/40 border-accent-pink'
            }`}
          >
            <div
              className={`text-3xl font-extrabold ${
                highContrast ? 'text-hc-primary' : 'text-accent-pink dark:text-accent-pink'
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
          className={`p-4 rounded-2xl text-center mb-4 border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(255,117,31,0.3)] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-accent-orange/20 dark:bg-orange-900/40 border-accent-orange'
          }`}
        >
          <div
            className={`text-3xl font-extrabold ${
              highContrast ? 'text-hc-primary' : 'text-accent-orange dark:text-accent-orange'
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

        <div>
          <ShareButton shareText={shareableStatsText} className="w-full" />
        </div>
      </div>
    </div>
  );
}
