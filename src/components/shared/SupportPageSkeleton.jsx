'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function SupportPageSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  const skeletonBg = highContrast
    ? 'bg-hc-surface border-2 border-hc-border'
    : 'bg-gray-200 dark:bg-gray-700';

  return (
    <div className="relative">
      <div
        className={`${highContrast ? 'bg-hc-background border-2 border-hc-border' : 'bg-ghost-white dark:bg-gray-800'} rounded-lg overflow-hidden relative z-10`}
      >
        {/* Header with back button, title, and hamburger menu */}
        <div
          className={`flex items-center justify-between p-6 pb-4 ${highContrast ? 'border-b-2 border-hc-border' : 'border-b border-border-light'}`}
        >
          {/* Back button skeleton */}
          <div className={`w-10 h-10 rounded-full ${skeletonBg}`} />

          {/* Title skeleton */}
          <div
            className={`h-6 w-32 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />

          {/* Hamburger menu skeleton */}
          <div className={`w-10 h-10 rounded-full ${skeletonBg}`} />
        </div>

        {/* Game Toggle Buttons skeleton */}
        <div className="p-6 pb-4">
          <div className="flex gap-2">
            <div
              className={`h-12 flex-1 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-12 flex-1 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>

        {/* Content - Accordion items skeleton */}
        <div className="p-6 pt-0">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`rounded-lg overflow-hidden ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              >
                <div className={`h-12 ${skeletonBg}`} />
              </div>
            ))}
          </div>

          {/* System Requirements skeleton */}
          <div
            className={`mt-8 pt-6 ${highContrast ? 'border-t-2 border-hc-border' : 'border-t border-gray-300 dark:border-gray-600'}`}
          >
            <div
              className={`h-5 w-48 ${skeletonBg} rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div
                  className={`h-4 w-20 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
              </div>
              <div className="space-y-2">
                <div
                  className={`h-4 w-24 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-3 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Faux drop shadow */}
      <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-lg -z-10"></div>
    </div>
  );
}
