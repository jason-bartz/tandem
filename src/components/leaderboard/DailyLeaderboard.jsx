'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import LeaderboardEntry from './LeaderboardEntry';
import Image from 'next/image';

/**
 * DailyLeaderboard - Displays top 10 players for today's daily puzzle
 *
 * @param {string} gameType - 'tandem' or 'cryptic'
 */
export default function DailyLeaderboard({ gameType }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { highContrast, theme } = useTheme();

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [gameType]);

  async function fetchLeaderboard() {
    try {
      const puzzleInfo = getCurrentPuzzleInfo();
      const url = `/api/leaderboard/daily?game=${gameType}&date=${puzzleInfo.isoDate}&limit=10`;
      console.log('[DailyLeaderboard] Fetching from:', url);

      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      console.log('[DailyLeaderboard] Response:', {
        success: data.success,
        leaderboardCount: data.leaderboard?.length || 0,
        leaderboard: data.leaderboard,
        userRank: data.userRank,
      });

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank);
      } else {
        console.error('[DailyLeaderboard] API returned success=false:', data);
      }
    } catch (err) {
      console.error('[DailyLeaderboard] Fetch error:', err);
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
          <Image
            src={theme === 'dark' ? '/icons/ui/medal-dark.png' : '/icons/ui/medal.png'}
            alt="Medal"
            width={48}
            height={48}
          />
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
      {/* Show simple list if less than 3 players */}
      {leaderboard.length > 0 && leaderboard.length < 3 && (
        <div className="space-y-2">
          {leaderboard.map((entry, idx) => (
            <LeaderboardEntry
              key={entry.user_id}
              entry={entry}
              rank={idx + 1}
              isCurrentUser={user?.id === entry.user_id}
            />
          ))}
        </div>
      )}

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
              className={`text-xs ${highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {formatTime(leaderboard[1]?.score)}
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
              className={`text-sm font-semibold ${highContrast ? 'text-hc-success' : 'text-sky-600 dark:text-sky-400'}`}
            >
              {formatTime(leaderboard[0]?.score)}
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
              className={`text-xs ${highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {formatTime(leaderboard[2]?.score)}
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
            />
          ))}
        </div>
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
