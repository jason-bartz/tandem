'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function AchievementsModalSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  return (
    <>
      {/* Summary Stats Skeleton */}
      <div
        className={`rounded-2xl border-[3px] p-4 mb-4 ${
          highContrast
            ? 'bg-hc-primary border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
            : 'bg-accent-blue dark:bg-accent-blue border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div
              className={`h-9 w-20 bg-ghost-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-3 w-16 bg-ghost-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
          <div className="w-px h-12 bg-ghost-white/30"></div>
          <div className="text-center">
            <div
              className={`h-9 w-20 bg-ghost-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-3 w-16 bg-ghost-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Tab Filters Skeleton */}
      <div className="flex gap-2 mb-4">
        <div
          className={`flex-1 h-9 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-gray-200 dark:bg-gray-700 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
        <div
          className={`flex-1 h-9 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-gray-200 dark:bg-gray-700 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
        <div
          className={`flex-1 h-9 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-gray-200 dark:bg-gray-700 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
        <div
          className={`flex-1 h-9 rounded-xl border-[3px] ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-gray-200 dark:bg-gray-700 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
          } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
      </div>

      {/* Achievement Cards Grid Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`rounded-2xl border-[3px] p-4 ${
              highContrast
                ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-ghost-white dark:bg-bg-card border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Emoji Icon Skeleton - matches w-16 h-16 from AchievementCard */}
              <div
                className={`w-16 h-16 rounded-xl border-[2px] flex-shrink-0 ${
                  highContrast
                    ? 'border-hc-border bg-hc-surface'
                    : 'border-black dark:border-gray-600 bg-gray-200 dark:bg-gray-700'
                } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100}ms` : '0ms',
                }}
              />

              {/* Content Skeleton */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div
                  className={`h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{
                    animationDelay: !reduceMotion ? `${i * 100 + 50}ms` : '0ms',
                  }}
                />
                {/* Description */}
                <div
                  className={`h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{
                    animationDelay: !reduceMotion ? `${i * 100 + 100}ms` : '0ms',
                  }}
                />
                {/* Unlocked text */}
                <div
                  className={`h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{
                    animationDelay: !reduceMotion ? `${i * 100 + 150}ms` : '0ms',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
