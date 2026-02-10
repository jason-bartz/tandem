'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReelConnectionsModal from './ReelConnectionsModal';
import ReelConnectionsAuthModal from './ReelConnectionsAuthModal';
import { useReelConnectionsStats } from '@/hooks/useReelConnectionsStats';
import { useAuth } from '@/contexts/AuthContext';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import { Trophy, Clock, Flame, Target, User } from 'lucide-react';
import logger from '@/lib/logger';

/**
 * StatsModal - Statistics modal for Reel Connections game
 * Displays games played, average time, current streak, and best streak
 * Includes leaderboard integration with Today and Best Streaks tabs
 * Styled with cinematic theme matching the game
 */
export default function StatsModal({ isOpen, onClose }) {
  const { stats, isLoaded, getAverageTimeMs, formatTime } = useReelConnectionsStats();
  const { user } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const averageTime = getAverageTimeMs();

  // Fetch leaderboard data
  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard, activeTab]);

  async function fetchLeaderboard() {
    setLeaderboardLoading(true);
    try {
      // Use local date to match the format used when submitting scores
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const endpoint =
        activeTab === 'daily'
          ? `/api/leaderboard/daily?game=reel&date=${today}&limit=10`
          : `/api/leaderboard/streak?game=reel&limit=10`;

      const apiUrl = getApiUrl(endpoint);
      const response = await capacitorFetch(apiUrl);
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setUserRank(activeTab === 'daily' ? data.userRank : data.userEntry);
      }
    } catch (err) {
      logger.error('[ReelConnectionsLeaderboard] Fetch error:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Refresh leaderboard after auth
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  };

  return (
    <>
      <ReelConnectionsModal isOpen={isOpen} onClose={onClose} title="Statistics" maxHeight="85vh">
        <div className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Games Played */}
            <StatCard
              icon={<Target className="w-5 h-5" />}
              value={isLoaded ? stats.gamesPlayed : '-'}
              label="Played"
              color="bg-[#ffce00]"
            />

            {/* Average Time */}
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              value={isLoaded ? (averageTime > 0 ? formatTime(averageTime) : '--:--') : '-'}
              label="Avg Time"
              color="bg-[#7ed957]"
            />

            {/* Current Streak */}
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              value={isLoaded ? stats.currentStreak : '-'}
              label="Current Streak"
              color="bg-[#ff5757]"
            />

            {/* Best Streak */}
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              value={isLoaded ? stats.bestStreak : '-'}
              label="Best Streak"
              color="bg-[#cb6ce6]"
            />
          </div>

          {/* Leaderboard Section */}
          {!showLeaderboard ? (
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full py-4 bg-[#39b6ff] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg capitalize tracking-wide"
            >
              View Leaderboard
            </button>
          ) : (
            <div className="bg-ghost-white/5 rounded-xl border-[2px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex border-b-2 border-white/10">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`flex-1 px-4 py-3 font-bold text-sm transition-all ${
                    activeTab === 'daily'
                      ? 'bg-[#ffce00] text-[#2c2c2c]'
                      : 'text-white/60 hover:text-white hover:bg-ghost-white/5'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setActiveTab('streak')}
                  className={`flex-1 px-4 py-3 font-bold text-sm transition-all ${
                    activeTab === 'streak'
                      ? 'bg-[#ffce00] text-[#2c2c2c]'
                      : 'text-white/60 hover:text-white hover:bg-ghost-white/5'
                  }`}
                >
                  Best Streaks
                </button>
              </div>

              {/* Leaderboard Content */}
              <div className="p-4">
                {leaderboardLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg bg-ghost-white/5 animate-pulse"
                      >
                        <div className="w-6 h-6 bg-ghost-white/10 rounded-lg" />
                        <div className="w-8 h-8 bg-ghost-white/10 rounded-full" />
                        <div className="flex-1 h-4 bg-ghost-white/10 rounded" />
                      </div>
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">🎬</div>
                    <p className="text-white/70 text-sm font-bold">
                      {activeTab === 'daily' ? 'Be the First!' : 'Start Your Streak!'}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      {activeTab === 'daily'
                        ? "Complete today's puzzle to appear on the leaderboard"
                        : 'Build a streak to compete for the top spot'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <LeaderboardEntry
                        key={entry.user_id}
                        entry={entry}
                        rank={idx + 1}
                        isCurrentUser={user?.id === entry.user_id}
                        isStreak={activeTab === 'streak'}
                      />
                    ))}

                    {/* User's rank if not in top 10 */}
                    {userRank && userRank.rank > 10 && (
                      <div className="mt-4 pt-4 border-t-2 border-white/10">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#ffce00]/20 border-2 border-[#ffce00]">
                          <div>
                            <p className="text-sm font-bold text-white">Your Rank</p>
                            <p className="text-xs text-white/60">
                              {activeTab === 'streak'
                                ? `${userRank.score} day streak`
                                : formatTimeSeconds(userRank.score)}
                            </p>
                          </div>
                          <div className="text-xl font-black text-[#ffce00]">#{userRank.rank}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auth CTA for non-logged in users */}
                {!user && !leaderboardLoading && (
                  <div className="mt-4 pt-4 border-t-2 border-white/10">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full py-3 bg-[#ffce00] border-[2px] border-black rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,0.8)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.8)] transition-all text-[#2c2c2c] font-bold text-sm"
                    >
                      Sign In to Join Leaderboard
                    </button>
                  </div>
                )}
              </div>

              {/* Hide Leaderboard button */}
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-full py-2 text-white/50 text-xs font-medium hover:text-white/70 transition-colors border-t-2 border-white/10"
              >
                Hide Leaderboard
              </button>
            </div>
          )}

          {/* Recent Games */}
          {isLoaded && stats.gameHistory.length > 0 && (
            <div className="bg-ghost-white/5 rounded-xl p-4 border-[2px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
              <h3 className="text-sm font-bold text-white/70 mb-3">Recent Games</h3>
              <div className="space-y-2">
                {stats.gameHistory.slice(0, 5).map((game, index) => (
                  <div
                    key={game.date + index}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${game.won ? 'bg-[#7ed957]' : 'bg-[#ff5757]'}`}
                      />
                      <span className="text-white/60">{formatDate(game.date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {game.won && <span className="text-white/50">{formatTime(game.timeMs)}</span>}
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          game.won
                            ? 'bg-[#7ed957]/20 text-[#7ed957]'
                            : 'bg-[#ff5757]/20 text-[#ff5757]'
                        }`}
                      >
                        {game.won ? 'Won' : 'Lost'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {isLoaded && stats.gamesPlayed === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-white/70 mb-2">No games played yet</p>
              <p className="text-sm text-white/50">Complete your first puzzle to see your stats!</p>
            </div>
          )}

          {/* Loading State */}
          {!isLoaded && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffce00] mx-auto" />
            </div>
          )}

          {/* Account Management Link */}
          {user && (
            <div className="pt-2 border-t-2 border-white/10">
              <Link
                href="/account"
                className="flex items-center justify-center gap-2 py-3 text-white/60 hover:text-[#ffce00] transition-colors text-sm font-medium"
              >
                <User className="w-4 h-4" />
                Manage Account
              </Link>
            </div>
          )}
        </div>
      </ReelConnectionsModal>

      {/* Auth Modal */}
      <ReelConnectionsAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

/**
 * StatCard - Individual stat display card
 */
function StatCard({ icon, value, label, color }) {
  return (
    <div className="relative bg-ghost-white/5 rounded-xl p-4 border-[2px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
      <div
        className={`absolute top-3 right-3 w-8 h-8 ${color} rounded-lg flex items-center justify-center text-[#0f0f1e]`}
      >
        {icon}
      </div>
      <div className="pr-10">
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-white/60 tracking-wider">{label}</div>
      </div>
    </div>
  );
}

/**
 * LeaderboardEntry - Individual leaderboard row
 */
function LeaderboardEntry({ entry, rank, isCurrentUser, isStreak }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
        isCurrentUser
          ? 'bg-[#ffce00]/20 border-2 border-[#ffce00]'
          : 'bg-ghost-white/5 hover:bg-ghost-white/10'
      }`}
    >
      {/* Rank */}
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
          isCurrentUser ? 'bg-[#ffce00] text-[#2c2c2c]' : 'bg-ghost-white/10 text-white/70'
        }`}
      >
        {rank}
      </div>

      {/* Avatar */}
      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
        <Image
          src={(entry.avatar_image_path || entry.avatar_url || '/avatars/default.png').replace(
            '/images/avatars/',
            '/avatars/'
          )}
          alt={entry.username || 'Anonymous'}
          fill
          className="object-cover"
          sizes="32px"
        />
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-sm truncate ${
            isCurrentUser ? 'text-[#ffce00]' : 'text-white'
          }`}
        >
          {entry.username || 'Anonymous'}
          {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
        </p>
      </div>

      {/* Score */}
      <div
        className={`text-right flex-shrink-0 font-bold text-sm ${
          isCurrentUser ? 'text-[#ffce00]' : 'text-white/70'
        }`}
      >
        {isStreak ? <span>{entry.score} 🔥</span> : formatTimeSeconds(entry.score)}
      </div>
    </div>
  );
}

/**
 * Format time from seconds to MM:SS
 */
function formatTimeSeconds(seconds) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date string to readable format
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today';
  } else if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
