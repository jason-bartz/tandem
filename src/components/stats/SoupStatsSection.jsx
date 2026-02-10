'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import StatCard from './StatCard';
import StatsSection from './StatsSection';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { useCounterAnimation } from '@/hooks/useAnimation';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useAuth } from '@/contexts/AuthContext';
import FirstDiscoveriesModal from '@/components/daily-alchemy/FirstDiscoveriesModal';
import { ASSET_VERSION } from '@/lib/constants';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * SoupStatsSection - Displays Daily Alchemy stats
 * Uses GREEN theme to match Daily Alchemy branding
 * On standalone, hides the title/icon header and moves discoveries to its own section
 *
 * @param {Object} stats - Soup stats object
 * @param {boolean} animationKey - Key to trigger re-animation
 */
export default function SoupStatsSection({ stats, animationKey }) {
  const [showFirstDiscoveries, setShowFirstDiscoveries] = useState(false);
  const [discoveriesCount, setDiscoveriesCount] = useState(null);
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();
  const { session } = useAuth();

  // Fetch this player's first discoveries count from API (standalone only)
  // The API filters by user_id - pagination.total is this player's personal count
  const fetchDiscoveriesCount = useCallback(async () => {
    if (!isStandaloneAlchemy || !session) return;
    try {
      const response = await fetch('/api/daily-alchemy/discoveries?limit=1', {
        credentials: 'include',
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDiscoveriesCount(data.pagination?.total ?? 0);
      }
    } catch {
      // Fall back to stats value
    }
  }, [session]);

  useEffect(() => {
    fetchDiscoveriesCount();
  }, [fetchDiscoveriesCount]);

  // Format average time (seconds to MM:SS)
  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animated counter values
  const animatedCompleted = useCounterAnimation(stats.totalCompleted || 0, animationKey);
  const animatedCurrentStreak = useCounterAnimation(stats.currentStreak || 0, animationKey);
  const animatedBestStreak = useCounterAnimation(stats.longestStreak || 0, animationKey);

  return (
    <>
      <StatsSection
        title={isStandaloneAlchemy ? null : 'Daily Alchemy'}
        icon={isStandaloneAlchemy ? null : `/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`}
        themeColor="green"
      >
        {/* All Stats in a Row */}
        <div className={`grid grid-cols-4 gap-3 ${isStandaloneAlchemy ? '' : 'mb-3'}`}>
          <StatCard value={animatedCompleted} label="Played" />
          <StatCard
            value={formatTime(stats.averageTime || 0)}
            label="Average Time"
            animate={false}
          />
          <StatCard
            value={animatedCurrentStreak}
            label="Current Streak"
            emoji={getStreakMilestone(stats.currentStreak || 0)}
          />
          <StatCard value={animatedBestStreak} label="Best Streak" />
        </div>

        {/* Discoveries Button - inside stats card on main site only */}
        {!isStandaloneAlchemy && (
          <button
            onClick={() => {
              lightTap();
              setShowFirstDiscoveries(true);
            }}
            className={`w-full py-3 px-4 rounded-[20px] border-[3px] font-semibold text-sm transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-primary text-hc-text border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                : 'bg-soup-primary dark:bg-soup-hover text-white border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000]'
            }`}
          >
            View Discoveries
          </button>
        )}
      </StatsSection>

      {/* Standalone: Discoveries section as its own card */}
      {isStandaloneAlchemy && (
        <div
          className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-gray-800 border-black shadow-[4px_4px_0px_#000]'
          }`}
        >
          <div className="px-4 py-4">
            {/* First Discoveries Count */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/ui/stats/discovery.png"
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span
                  className={`font-semibold text-sm ${
                    highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  First Discoveries
                </span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  highContrast ? 'text-hc-text' : 'text-soup-dark dark:text-soup-primary'
                }`}
              >
                {discoveriesCount !== null ? discoveriesCount : stats.firstDiscoveries || 0}
              </span>
            </div>

            {/* View Discoveries Button */}
            <button
              onClick={() => {
                lightTap();
                setShowFirstDiscoveries(true);
              }}
              className={`w-full py-3 px-4 rounded-[20px] border-[3px] font-semibold text-sm transition-all flex items-center justify-center ${
                highContrast
                  ? 'bg-hc-primary text-hc-text border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                  : 'bg-soup-primary dark:bg-soup-hover text-white border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000]'
              }`}
            >
              View Discoveries
            </button>
          </div>
        </div>
      )}

      {/* First Discoveries Modal */}
      <FirstDiscoveriesModal
        isOpen={showFirstDiscoveries}
        onClose={() => setShowFirstDiscoveries(false)}
      />
    </>
  );
}
