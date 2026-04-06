'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function LegalPageSkeleton() {
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

        {/* Content - Legal text skeleton */}
        <div className="p-6">
          {/* Last updated skeleton */}
          <div
            className={`h-4 w-40 ${skeletonBg} rounded mb-6 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />

          {/* Text paragraphs skeleton */}
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-3">
                {/* Section heading */}
                <div
                  className={`h-5 w-48 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                {/* Paragraph lines */}
                <div className="space-y-2">
                  <div
                    className={`h-4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  />
                  <div
                    className={`h-4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ width: '95%' }}
                  />
                  <div
                    className={`h-4 ${skeletonBg} rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ width: '90%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Faux drop shadow */}
      <div className="absolute inset-0 bg-black dark:bg-ghost-white rounded-lg -z-10"></div>
    </div>
  );
}
