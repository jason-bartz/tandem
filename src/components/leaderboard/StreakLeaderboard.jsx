'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import LeaderboardEntry from './LeaderboardEntry';
import Image from 'next/image';

/**
 * StreakLeaderboard - Displays top 10 players by best streak
 *
 * @param {string} gameType - 'tandem' or 'cryptic'
 */
export default function StreakLeaderboard({ gameType }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userEntry, setUserEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { highContrast, theme } = useTheme();

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every minute
    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [gameType]);

  async function fetchLeaderboard() {
    try {
      const url = `/api/leaderboard/streak?game=${gameType}&limit=10`;
      console.log('[StreakLeaderboard] Fetching from:', url);

      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      console.log('[StreakLeaderboard] Response:', {
        success: data.success,
        leaderboardCount: data.leaderboard?.length || 0,
        leaderboard: data.leaderboard,
        userEntry: data.userEntry,
      });

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserEntry(data.userEntry);
      } else {
        console.error('[StreakLeaderboard] API returned success=false:', data);
      }
    } catch (err) {
      console.error('[StreakLeaderboard] Fetch error:', err);
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
          <Image
            src={theme === 'dark' ? '/icons/ui/hardmode-dark.png' : '/icons/ui/hardmode.png'}
            alt="Streak"
            width={48}
            height={48}
          />
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
      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex justify-center items-end gap-4 mb-8 px-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1 max-w-[120px]">
            <div className="relative w-16 h-16 mb-2">
              <Image
                src={leaderboard[1]?.avatar_url || '/images/avatars/default-profile.png'}
                alt={leaderboard[1]?.username || 'Player 2'}
                fill
                className="object-cover rounded-full border-[3px] border-gray-400"
                sizes="64px"
              />
            </div>
            <div className="text-3xl mb-1">🥈</div>
            <p
              className={`font-bold text-sm text-center truncate w-full ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              {leaderboard[1]?.username || 'Anonymous'}
            </p>
            <p
              className={`text-xs flex items-center gap-1 ${highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <Image
                src={theme === 'dark' ? '/icons/ui/hardmode-dark.png' : '/icons/ui/hardmode.png'}
                alt=""
                width={12}
                height={12}
              />
              {leaderboard[1]?.score} days
            </p>
          </div>

          {/* 1st Place - Taller */}
          <div className="flex flex-col items-center flex-1 max-w-[140px] -mt-6">
            <div className="relative w-20 h-20 mb-2">
              <Image
                src={leaderboard[0]?.avatar_url || '/images/avatars/default-profile.png'}
                alt={leaderboard[0]?.username || 'Player 1'}
                fill
                className="object-cover rounded-full border-[3px] border-yellow-400"
                sizes="80px"
              />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-[2px] border-black dark:border-gray-600 shadow-lg">
                <span className="text-lg">👑</span>
              </div>
            </div>
            <div className="text-4xl mb-1">🥇</div>
            <p
              className={`font-bold text-base text-center truncate w-full ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              {leaderboard[0]?.username || 'Anonymous'}
            </p>
            <p
              className={`text-sm font-semibold flex items-center gap-1 ${highContrast ? 'text-hc-success' : 'text-orange-600 dark:text-orange-400'}`}
            >
              <Image
                src={theme === 'dark' ? '/icons/ui/hardmode-dark.png' : '/icons/ui/hardmode.png'}
                alt=""
                width={14}
                height={14}
              />
              {leaderboard[0]?.score} days
            </p>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1 max-w-[120px]">
            <div className="relative w-16 h-16 mb-2">
              <Image
                src={leaderboard[2]?.avatar_url || '/images/avatars/default-profile.png'}
                alt={leaderboard[2]?.username || 'Player 3'}
                fill
                className="object-cover rounded-full border-[3px] border-orange-600"
                sizes="64px"
              />
            </div>
            <div className="text-3xl mb-1">🥉</div>
            <p
              className={`font-bold text-sm text-center truncate w-full ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'}`}
            >
              {leaderboard[2]?.username || 'Anonymous'}
            </p>
            <p
              className={`text-xs flex items-center gap-1 ${highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <Image
                src={theme === 'dark' ? '/icons/ui/hardmode-dark.png' : '/icons/ui/hardmode.png'}
                alt=""
                width={12}
                height={12}
              />
              {leaderboard[2]?.score} days
            </p>
          </div>
        </div>
      )}

      {/* Rest of leaderboard (4-10) */}
      {leaderboard.length > 3 && (
        <div className="space-y-2">
          <h3
            className={`text-sm font-semibold mb-3 px-2 ${highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'}`}
          >
            Top 10
          </h3>
          {leaderboard.slice(3).map((entry, idx) => (
            <LeaderboardEntry
              key={entry.user_id}
              entry={entry}
              rank={idx + 4}
              isCurrentUser={user?.id === entry.user_id}
              isStreak
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
                <Image
                  src={theme === 'dark' ? '/icons/ui/hardmode-dark.png' : '/icons/ui/hardmode.png'}
                  alt=""
                  width={12}
                  height={12}
                />
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
