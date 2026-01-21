'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * LeaderboardEntry - Individual entry in the leaderboard list
 *
 * @param {object} entry - Leaderboard entry data
 * @param {number} rank - Player's rank (1-indexed)
 * @param {boolean} isCurrentUser - Whether this is the current user
 * @param {boolean} isStreak - Whether this is a streak leaderboard (vs speed)
 */
export default function LeaderboardEntry({ entry, rank, isCurrentUser, isStreak = false }) {
  const { highContrast } = useTheme();

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        isCurrentUser
          ? highContrast
            ? 'bg-hc-primary/20 border-[2px] border-hc-border'
            : 'bg-sky-50 dark:bg-sky-900/20 border-[2px] border-sky-200 dark:border-sky-800'
          : highContrast
            ? 'bg-hc-surface/50'
            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {/* Rank */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          isCurrentUser
            ? highContrast
              ? 'bg-hc-primary text-white'
              : 'bg-sky-500 text-white'
            : highContrast
              ? 'bg-hc-surface text-hc-text border-[2px] border-hc-border'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        {rank}
      </div>

      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden border-[2px] border-gray-200 dark:border-gray-700 flex-shrink-0">
        <Image
          src={entry.avatar_image_path || entry.avatar_url || '/images/avatars/default-profile.png'}
          alt={entry.display_name || 'Anonymous'}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold truncate ${
            isCurrentUser
              ? highContrast
                ? 'text-hc-text'
                : 'text-sky-700 dark:text-sky-300'
              : highContrast
                ? 'text-hc-text'
                : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {entry.display_name || 'Anonymous'}
          {isCurrentUser && <span className="text-xs ml-2">(You)</span>}
        </p>
        <p
          className={`text-xs ${highContrast ? 'text-hc-text/60' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {isStreak ? (
            <span className="flex items-center gap-1">
              <Image src="/icons/ui/hardmode.png" alt="" width={12} height={12} />
              {entry.score} day streak
            </span>
          ) : entry.metadata?.hintsUsed > 0 ? (
            `${entry.metadata.hintsUsed} hint${entry.metadata.hintsUsed > 1 ? 's' : ''} used`
          ) : (
            'No hints'
          )}
        </p>
      </div>

      {/* Score */}
      <div
        className={`text-right flex-shrink-0 font-bold ${
          isCurrentUser
            ? highContrast
              ? 'text-hc-primary'
              : 'text-sky-600 dark:text-sky-400'
            : highContrast
              ? 'text-hc-text'
              : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {isStreak ? (
          <div className="text-lg flex items-center gap-1">
            <Image src="/icons/ui/hardmode.png" alt="" width={16} height={16} />
            {entry.score}
          </div>
        ) : (
          formatTime(entry.score)
        )}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
