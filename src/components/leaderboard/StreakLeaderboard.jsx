'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import LeaderboardEntry from './LeaderboardEntry';
import Image from 'next/image';
import logger from '@/lib/logger';

/**
 * StreakLeaderboard - Displays top 10 players by best streak
 *
 * @param {string} gameType - 'tandem' or 'mini'
 */
export default function StreakLeaderboard({ gameType }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userEntry, setUserEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { highContrast } = useTheme();

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every minute
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [gameType]);

  async function fetchLeaderboard() {
    try {
      // Import API config for iOS compatibility
      const { capacitorFetch, getApiUrl } = await import('@/lib/api-config');
      const url = getApiUrl(`/api/leaderboard/streak?game=${gameType}&limit=10`);

      const response = await capacitorFetch(url, {
        method: 'GET',
      });
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserEntry(data.userEntry);
      } else {
        logger.error('[StreakLeaderboard] API returned success=false:', null, data);
      }
    } catch (err) {
      logger.error('[StreakLeaderboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    // Skeleton loader
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
          <Image src="/icons/ui/hardmode.png" alt="Streak" width={48} height={48} />
        </div>
        <p
          className={`text-lg font-semibold mb-2 ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
        >
          Start Your Streak!
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Build a streak to compete for the top spot
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Traditional row-style leaderboard */}
      {leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((entry, idx) => (
            <LeaderboardEntry
              key={entry.user_id}
              entry={entry}
              rank={idx + 1}
              isCurrentUser={user?.id === entry.user_id}
              isStreak={true}
            />
          ))}
        </div>
      )}

      {/* User's rank if not in top 10 */}
      {userEntry && userEntry.rank > 10 && (
        <div
          className={`mt-6 p-4 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-primary/20 border-hc-border'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-sm font-semibold ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
              >
                Your Best Streak
              </p>
              <p
                className={`text-xs flex items-center gap-1 ${highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <Image src="/icons/ui/hardmode.png" alt="" width={12} height={12} />
                {userEntry.score} days
              </p>
            </div>
            <div
              className={`text-2xl font-bold ${highContrast ? 'text-hc-primary' : 'text-orange-600 dark:text-orange-400'}`}
            >
              #{userEntry.rank}
            </div>
          </div>
        </div>
      )}

      {/* Call to action if user hasn't submitted */}
      {!userEntry && user && (
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
            Build Your Streak!
          </p>
          <p
            className={`text-xs ${highContrast ? 'text-hc-text/70' : 'text-purple-600 dark:text-purple-400'}`}
          >
            Complete puzzles daily to build a streak and compete for the top spot
          </p>
        </div>
      )}
    </div>
  );
}
