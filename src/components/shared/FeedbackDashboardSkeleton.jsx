'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * FeedbackDashboardSkeleton - Loading state for admin feedback dashboard
 */
export default function FeedbackDashboardSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  const skeletonBg = highContrast
    ? 'bg-hc-surface border-2 border-hc-border'
    : 'bg-gray-200 dark:bg-gray-700';

  return (
    <div className="space-y-4">
      {/* Sort & Filter Row Skeleton */}
      <div
        className={`flex items-center justify-between gap-3 py-2 ${highContrast ? 'border-b-2 border-hc-border' : 'border-b dark:border-white/10'}`}
      >
        <div
          className={`h-5 w-20 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
        <div
          className={`h-8 w-20 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
      </div>

      {/* Feedback Entry Cards Skeleton */}
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-xl overflow-hidden ${highContrast ? 'bg-hc-surface border-2 border-hc-border' : 'bg-ghost-white dark:bg-bg-surface'}`}
          >
            {/* Header Skeleton */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 ${highContrast ? 'bg-hc-background border-b-2 border-hc-border' : 'bg-gray-100 dark:bg-gray-800 border-b border-border-light'}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`h-6 w-16 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{ animationDelay: !reduceMotion ? `${i * 100}ms` : '0ms' }}
                />
                <div
                  className={`h-4 w-20 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{ animationDelay: !reduceMotion ? `${i * 100 + 50}ms` : '0ms' }}
                />
              </div>
              <div
                className={`h-7 w-32 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{ animationDelay: !reduceMotion ? `${i * 100 + 100}ms` : '0ms' }}
              />
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] divide-y-[3px] lg:divide-y-0 lg:divide-x-[3px] divide-black dark:divide-white">
              {/* User Section Skeleton */}
              <div className="p-5 space-y-4">
                <div>
                  <div
                    className={`h-3 w-24 ${skeletonBg} rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  />
                  <div className="space-y-2">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="flex flex-col gap-1">
                        <div
                          className={`h-3 w-16 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                        />
                        <div
                          className={`h-4 w-32 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`pt-3 ${highContrast ? 'border-t-2 border-hc-border' : 'border-t border-gray-200 dark:border-gray-700'}`}
                >
                  <div
                    className={`h-3 w-16 ${skeletonBg} rounded mb-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  />
                  <div
                    className={`p-3 rounded-lg ${highContrast ? 'bg-hc-background border-2 border-hc-border' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                  >
                    <div className="space-y-2">
                      <div
                        className={`h-3 w-full ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                      />
                      <div
                        className={`h-3 w-4/5 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                      />
                      <div
                        className={`h-3 w-3/4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Section Skeleton */}
              <div
                className={`p-5 space-y-4 ${highContrast ? 'bg-hc-background' : 'bg-gray-50/50 dark:bg-gray-900/20'}`}
              >
                <div>
                  <div
                    className={`h-3 w-24 ${skeletonBg} rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  />
                  <div
                    className={`h-4 w-32 ${skeletonBg} rounded mb-4 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  />

                  <div className="space-y-2">
                    <div
                      className={`h-20 w-full ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    />
                    <div
                      className={`h-9 w-full ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
