'use client';

/**
 * FeedbackDashboardSkeleton - Loading state for admin feedback dashboard
 */
export default function FeedbackDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="h-3 w-40 bg-gray-300 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Status Tabs Skeleton */}
        <div className="flex gap-2 border-b-[3px] border-black dark:border-white pb-1 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-4 py-3 border-[3px] border-black dark:border-white rounded-t-lg bg-white dark:bg-gray-800 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="h-5 w-8 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="h-3 w-12 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg border-[2px] border-black dark:border-white animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Entry Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border-[3px] border-black dark:border-white bg-white dark:bg-bg-surface shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] overflow-hidden"
          >
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 bg-gray-100 dark:bg-gray-800 border-b-[3px] border-black dark:border-white">
              <div className="flex items-center gap-4">
                <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
              </div>
              <div className="h-7 w-32 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse" />
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] divide-y-[3px] lg:divide-y-0 lg:divide-x-[3px] divide-black dark:divide-white">
              {/* User Section Skeleton */}
              <div className="p-5 space-y-4">
                <div>
                  <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex flex-col gap-1">
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t-[2px] border-gray-200 dark:border-gray-700">
                  <div className="h-3 w-16 bg-gray-300 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-[2px] border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Section Skeleton */}
              <div className="p-5 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
                <div>
                  <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />

                  <div className="space-y-2">
                    <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
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
