'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * AdminPuzzleCalendarSkeleton - Loading state for admin puzzle calendar
 */
export default function AdminPuzzleCalendarSkeleton() {
  const { reduceMotion } = useTheme();

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
            className="relative aspect-square min-h-0 p-2 rounded-lg bg-ghost-white dark:bg-gray-800"
          >
            {/* Day number skeleton */}
            <div
              className={`h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded mb-1 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              style={{ animationDelay: !reduceMotion ? `${Math.min(i, 4) * 100}ms` : '0ms' }}
            />

            {/* Theme text skeleton */}
            <div className="space-y-1 mt-2">
              <div
                className={`h-2 w-full bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-2 w-3/4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>

            {/* Emoji skeleton */}
            <div
              className={`h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        ))}
      </div>

      {/* Legend skeleton */}
      <div className="mt-6 pt-4 border-t border-border-light">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
