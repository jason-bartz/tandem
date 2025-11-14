'use client';

/**
 * AdminPuzzleCalendarSkeleton - Loading state for admin puzzle calendar
 */
export default function AdminPuzzleCalendarSkeleton() {
  return (
    <div className="p-6">
      {/* Day names */}
      <div className="grid grid-cols-7 gap-3 mb-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-text-primary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="relative aspect-square min-h-0 p-2 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-800 animate-pulse"
            style={{
              boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)',
              animationDelay: `${(i % 7) * 50}ms`,
            }}
          >
            {/* Day number skeleton */}
            <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded mb-1" />

            {/* Theme text skeleton */}
            <div className="space-y-1 mt-2">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-2 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>

            {/* Emoji skeleton */}
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full mt-1" />
          </div>
        ))}
      </div>

      {/* Legend skeleton */}
      <div className="mt-6 pt-4 border-t-[3px] border-black dark:border-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
