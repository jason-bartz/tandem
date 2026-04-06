'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function AboutPageSkeleton() {
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
        <div className="flex items-center justify-between p-6 pb-4">
          {/* Back button skeleton */}
          <div className={`w-10 h-10 rounded-full ${skeletonBg}`} />

          {/* Title skeleton */}
          <div
            className={`h-6 w-20 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />

          {/* Hamburger menu skeleton */}
          <div className={`w-10 h-10 rounded-full ${skeletonBg}`} />
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {/* Text paragraphs skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div
                  className={`h-4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                <div
                  className={`h-4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{ width: '95%' }}
                />
                {i === 5 && (
                  <div
                    className={`h-4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ width: '60%' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Founder Image and Info skeleton */}
          <div
            className={`flex flex-col items-center pt-6 mt-6 ${highContrast ? 'border-t-2 border-hc-border' : 'border-t border-gray-300 dark:border-gray-600'}`}
          >
            {/* Profile image skeleton */}
            <div
              className={`w-32 h-32 rounded-full ${skeletonBg} mb-4 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />

            {/* Name skeleton */}
            <div
              className={`h-5 w-32 ${skeletonBg} rounded mb-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />

            {/* Title skeleton */}
            <div
              className={`h-4 w-48 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Call to Action button skeleton */}
          <div
            className={`mt-8 pt-6 ${highContrast ? 'border-t-2 border-hc-border' : 'border-t border-gray-300 dark:border-gray-600'}`}
          >
            <div
              className={`h-12 ${skeletonBg} rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>
      </div>
      {/* Faux drop shadow */}
      <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-lg -z-10"></div>
    </div>
  );
}
