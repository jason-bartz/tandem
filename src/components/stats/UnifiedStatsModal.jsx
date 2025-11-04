'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import useUnifiedStats from '@/hooks/useUnifiedStats';
import TandemStatsSection from './TandemStatsSection';
import CrypticStatsSection from './CrypticStatsSection';
import ShareButton from '../game/ShareButton';

/**
 * UnifiedStatsModal - Unified statistics modal for both games
 * Displays Tandem Daily and Daily Cryptic stats in a single modal
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 */
export default function UnifiedStatsModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();
  const [animationKey, setAnimationKey] = useState(0);

  // Load stats for both games
  const { tandemStats, crypticStats, loading, error } = useUnifiedStats(isOpen);

  // Trigger re-animation when modal opens
  useEffect(() => {
    if (isOpen !== false) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [isOpen]);

  if (isOpen === false) {
    return null;
  }

  // Generate shareable stats text
  const shareableStatsText = `My Tandem Games Stats 🚲
═══════════════════════

🚲 Tandem Daily
Played: ${tandemStats.played} | Win Rate: ${tandemStats.played > 0 ? Math.round((tandemStats.wins / tandemStats.played) * 100) : 0}%
Current Streak: ${tandemStats.currentStreak} ${tandemStats.currentStreak > 0 ? '🔥' : ''}

🧩 Daily Cryptic
Played: ${crypticStats.totalCompleted} | Best Streak: ${crypticStats.longestStreak || 0}
Current Streak: ${crypticStats.currentStreak} ${crypticStats.currentStreak > 0 ? '🔥' : ''}

Play at tandemdaily.com
#TandemGames`;

  const handleClose = () => {
    lightTap();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-5 animate-backdrop-enter gpu-accelerated"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-bg-card rounded-[32px] border-[3px] border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto modal-scrollbar animate-modal-enter gpu-accelerated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-200">Statistics</h2>
          <button
            onClick={handleClose}
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-accent-blue rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Loading stats...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            className={`p-4 rounded-2xl border-[3px] mb-4 ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }`}
          >
            <p
              className={`text-center ${
                highContrast ? 'text-hc-text' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {error}
            </p>
          </div>
        )}

        {/* Stats Sections */}
        {!loading && !error && (
          <>
            <TandemStatsSection stats={tandemStats} animationKey={animationKey} />
            <CrypticStatsSection stats={crypticStats} animationKey={animationKey} />
          </>
        )}

        {/* Share Button */}
        {!loading && !error && (
          <div className="mt-4">
            <ShareButton shareText={shareableStatsText} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
