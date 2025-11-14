'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function SupportPageSkeleton() {
  const { reduceMotion } = useTheme();

  return (
    <div className="relative">
      <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
        {/* Header with back button, title, and hamburger menu */}
        <div className="flex items-center justify-between p-6 pb-4 border-b-[3px] border-black dark:border-white">
          {/* Back button skeleton */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />

          {/* Title skeleton */}
          <div
            className={`h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />

          {/* Hamburger menu skeleton */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Game Toggle Buttons skeleton */}
        <div className="p-6 pb-4">
          <div className="flex gap-2">
            <div
              className={`h-12 flex-1 bg-gray-200 dark:bg-gray-700 rounded-2xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-12 flex-1 bg-gray-200 dark:bg-gray-700 rounded-2xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>

        {/* Content - Accordion items skeleton */}
        <div className="p-6 pt-0">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`border-[3px] border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              >
                <div className="h-12 bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>

          {/* System Requirements skeleton */}
          <div className="mt-8 pt-6 border-t-[3px] border-gray-300 dark:border-gray-600">
            <div
              className={`h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div
                  className={`h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
              </div>
              <div className="space-y-2">
                <div
                  className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Faux drop shadow */}
      <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
    </div>
  );
}
