'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';
import { ASSET_VERSION } from '@/lib/constants';

const GAME_ICONS = {
  tandem: '/ui/games/tandem.png',
  mini: '/ui/games/mini.png',
  reel: '/ui/games/movie.png',
  soup: `/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`,
};

// Full Tailwind class names so they're detected at build time (no dynamic interpolation)
const CATEGORY_STYLES = {
  Platform: {
    text: 'text-accent-purple',
    bg: 'bg-accent-purple',
    bgLight: 'bg-accent-purple/20',
    border: 'border-accent-purple',
  },
  'Daily Tandem': {
    text: 'text-accent-blue',
    bg: 'bg-accent-blue',
    bgLight: 'bg-accent-blue/20',
    border: 'border-accent-blue',
  },
  'Daily Mini': {
    text: 'text-accent-yellow',
    bg: 'bg-accent-yellow',
    bgLight: 'bg-accent-yellow/20',
    border: 'border-accent-yellow',
  },
  'Reel Connections': {
    text: 'text-accent-red',
    bg: 'bg-accent-red',
    bgLight: 'bg-accent-red/20',
    border: 'border-accent-red',
  },
  'Daily Alchemy': {
    text: 'text-accent-green',
    bg: 'bg-accent-green',
    bgLight: 'bg-accent-green/20',
    border: 'border-accent-green',
  },
};

const DEFAULT_STYLES = {
  text: 'text-accent-blue',
  bg: 'bg-accent-blue',
  bgLight: 'bg-accent-blue/20',
  border: 'border-accent-blue',
};

function formatNumber(n) {
  if (n === null || n === undefined) return '--';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatThreshold(n) {
  if (n >= 1000000) return `${n / 1000000}M`;
  if (n >= 1000) return `${n / 1000}K`;
  return n.toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MilestoneCard({ milestone }) {
  const styles = CATEGORY_STYLES[milestone.category] || DEFAULT_STYLES;
  const icon = milestone.icon ? GAME_ICONS[milestone.icon] : null;
  const isRecord = milestone.thresholds.length === 0;

  const nextThreshold = milestone.thresholds.find((t) => !t.reached);

  return (
    <div className="bg-bg-card rounded-lg p-3 space-y-2 aspect-square flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {icon && <Image src={icon} alt="" width={16} height={16} className="flex-shrink-0" />}
            <h4 className="text-xs font-bold text-text-primary truncate">{milestone.label}</h4>
          </div>
          {milestone.allReached && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent-green/20 text-accent-green border border-accent-green flex-shrink-0">
              ALL
            </span>
          )}
        </div>

        {/* Current value */}
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold ${styles.text}`}>
            {formatNumber(milestone.currentValue)}
          </span>
          {!isRecord && nextThreshold && (
            <span className="text-[10px] text-text-muted font-medium">
              / {formatThreshold(nextThreshold.value)}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isRecord && nextThreshold && (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full ${styles.bg} rounded-full transition-all duration-500`}
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[9px] text-text-muted font-medium">{milestone.progress}%</span>
            <span className="text-[9px] text-text-muted font-medium">
              {(nextThreshold.value - milestone.currentValue).toLocaleString()} to go
            </span>
          </div>
        </div>
      )}

      {/* Threshold pills */}
      {!isRecord && milestone.thresholds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {milestone.thresholds.map((t) => (
            <span
              key={t.value}
              title={t.loggedAt ? `Reached ${formatDate(t.loggedAt)}` : 'Not yet reached'}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                t.reached
                  ? `${styles.bgLight} ${styles.border} ${styles.text}`
                  : 'bg-bg-surface border-border-main text-text-muted'
              }`}
            >
              {formatThreshold(t.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({ name, milestones }) {
  const styles = CATEGORY_STYLES[name] || DEFAULT_STYLES;
  const icon = milestones[0]?.icon ? GAME_ICONS[milestones[0].icon] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        {icon && <Image src={icon} alt="" width={22} height={22} />}
        <h3 className={`text-sm font-bold ${styles.text} uppercase tracking-wide`}>{name}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {milestones.map((m) => (
          <MilestoneCard key={m.key} milestone={m} />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-32 bg-bg-card rounded skeleton-shimmer" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[...Array(3)].map((_, j) => (
              <div
                key={j}
                className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 h-32 skeleton-shimmer"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MilestoneTracker() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMilestones = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/admin/milestones', {
        headers: await authService.getAuthHeaders(true),
      });

      if (response.status === 401) {
        setError('Authentication expired - please log in again at /admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch milestones');
      }

      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
        setLastRefreshed(new Date());
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      logger.error('Error fetching milestones:', err);
      setError(err.message || 'Failed to load milestones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  if (loading) {
    return (
      <div className="bg-bg-surface rounded-lg">
        <div className="px-4 py-4 border-b border-border-light">
          <h2 className="text-lg font-bold text-text-primary">Milestones</h2>
        </div>
        <div className="p-4">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-lg">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Milestones</h2>
            {lastRefreshed && (
              <p className="text-[10px] text-text-muted font-medium mt-0.5">
                Last refreshed{' '}
                {lastRefreshed.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <button
            onClick={() => fetchMilestones(true)}
            disabled={refreshing}
            className="px-3 py-1.5 bg-bg-card rounded-md font-bold text-xs text-text-secondary hover:bg-muted transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {refreshing ? (
              <>
                <div className="w-3 h-3 border border-accent-purple border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-accent-red/20 text-accent-red font-bold text-sm">
            {error}
          </div>
        )}

        {/* Categories */}
        {categories &&
          Object.entries(categories).map(([name, milestones]) => (
            <CategorySection key={name} name={name} milestones={milestones} />
          ))}
      </div>
    </div>
  );
}
