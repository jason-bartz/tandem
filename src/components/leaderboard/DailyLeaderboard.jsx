'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import LeaderboardEntry from './LeaderboardEntry';
import Image from 'next/image';
import logger from '@/lib/logger';

/**
 * DailyLeaderboard - Displays top 10 players for today's daily puzzle
 *
 * @param {string} gameType - 'tandem' or 'mini'
 */
export default function DailyLeaderboard({ gameType }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { highContrast } = useTheme();

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [gameType]);

  async function fetchLeaderboard() {
    try {
      const puzzleInfo = getCurrentPuzzleInfo();

      // Import API config for iOS compatibility
      const { capacitorFetch, getApiUrl } = await import('@/lib/api-config');
      const url = getApiUrl(
        `/api/leaderboard/daily?game=${gameType}&date=${puzzleInfo.isoDate}&limit=10`
      );

      const response = await capacitorFetch(url, {
        method: 'GET',
      });
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank);
      } else {
        logger.error('[DailyLeaderboard] API returned success=false:', null, data);
      }
    } catch (err) {
      logger.error('[DailyLeaderboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    // Skeleton loader - mobile game best practice
    return (
      <div className="p-6 space-y-3 animate-pulse">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
          >
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Image src="/icons/ui/medal.png" alt="Medal" width={48} height={48} />
        </div>
        <p
          className={`text-lg font-semibold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
        >
          Be the First!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Complete today's puzzle to appear on the leaderboard
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Traditional row-style leaderboard */}
      {leaderboard.length > 0 && (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
            Top Ten Players
          </p>
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <LeaderboardEntry
                key={entry.entry_id}
                entry={entry}
                rank={idx + 1}
                isCurrentUser={user?.id === entry.user_id}
              />
            ))}
          </div>
        </>
      )}

      {/* User's rank if not in top 10 */}
      {userRank && userRank.rank > 10 && (
        <div
          className={`mt-6 p-4 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-primary/20 border-hc-border'
              : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-sm font-semibold ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
              >
                Your Rank
              </p>
              <p
                className={`text-xs ${highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'}`}
              >
                {formatTime(userRank.score)}
              </p>
            </div>
            <div
              className={`text-2xl font-bold ${highContrast ? 'text-hc-primary' : 'text-sky-600 dark:text-sky-400'}`}
            >
              #{userRank.rank}
            </div>
          </div>
          <div
            className={`mt-2 text-xs ${highContrast ? 'text-hc-text/60' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Out of {userRank.total_entries} players
          </div>
        </div>
      )}

      {/* Call to action if user hasn't played */}
      {!userRank && user && (
        <div
          className={`mt-6 p-4 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
          }`}
        >
          <p
            className={`text-sm font-semibold mb-1 ${highContrast ? 'text-hc-text' : 'text-purple-700 dark:text-purple-300'}`}
          >
            Join the Competition!
          </p>
          <p
            className={`text-xs ${highContrast ? 'text-hc-text/70' : 'text-purple-600 dark:text-purple-400'}`}
          >
            Complete today's puzzle to see your rank on the leaderboard
          </p>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
