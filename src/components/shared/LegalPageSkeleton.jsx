'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function LegalPageSkeleton() {
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

        {/* Content - Legal text skeleton */}
        <div className="p-6">
          {/* Last updated skeleton */}
          <div
            className={`h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-6 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />

          {/* Text paragraphs skeleton */}
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-3">
                {/* Section heading */}
                <div
                  className={`h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                />
                {/* Paragraph lines */}
                <div className="space-y-2">
                  <div
                    className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  />
                  <div
                    className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ width: '95%' }}
                  />
                  <div
                    className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ width: '90%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Faux drop shadow */}
      <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
    </div>
  );
}
