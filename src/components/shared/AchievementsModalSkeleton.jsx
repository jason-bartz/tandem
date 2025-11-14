'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function AchievementsModalSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  return (
    <div className="px-6 py-4">
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
              className={`h-9 w-20 bg-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-3 w-16 bg-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
          <div className="w-px h-12 bg-white/30"></div>
          <div className="text-center">
            <div
              className={`h-9 w-20 bg-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-3 w-16 bg-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Tab Filters Skeleton */}
      <div className="flex gap-2 mb-4">
        <div
          className={`flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
        <div
          className={`flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
      </div>

      {/* Achievement Cards Grid Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`rounded-2xl border-[3px] p-4 ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Icon Skeleton */}
              <div
                className={`w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100}ms` : '0ms',
                }}
              />

              {/* Content Skeleton */}
              <div className="flex-1">
                <div
                  className={`h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{
                    animationDelay: !reduceMotion ? `${i * 100 + 50}ms` : '0ms',
                  }}
                />
                <div
                  className={`h-4 w-full bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{
                    animationDelay: !reduceMotion ? `${i * 100 + 100}ms` : '0ms',
                  }}
                />
              </div>

              {/* Badge/Status Skeleton */}
              <div
                className={`w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100 + 150}ms` : '0ms',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
