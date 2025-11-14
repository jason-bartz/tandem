'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function AboutPageSkeleton() {
  const { reduceMotion } = useTheme();

  return (
    <div className="relative">
      <div className="bg-white dark:bg-gray-800 rounded-[32px] border-[3px] border-black dark:border-white overflow-hidden -translate-x-[4px] -translate-y-[4px] relative z-10">
        {/* Header with back button, title, and hamburger menu */}
        <div className="flex items-center justify-between p-6 pb-4">
          {/* Back button skeleton */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />

          {/* Title skeleton */}
          <div className={`h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`} />

          {/* Hamburger menu skeleton */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {/* Text paragraphs skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`} />
                <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`} style={{ width: '95%' }} />
                {i === 5 && <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`} style={{ width: '60%' }} />}
              </div>
            ))}
          </div>

          {/* Founder Image and Info skeleton */}
          <div className="flex flex-col items-center pt-6 mt-6 border-t-[3px] border-gray-300 dark:border-gray-600">
            {/* Profile image skeleton */}
            <div className={`w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 border-[3px] border-gray-300 dark:border-gray-600 mb-4 ${!reduceMotion ? 'skeleton-shimmer' : ''}`} />

            {/* Name skeleton */}
            <div className={`h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`} />

            {/* Title skeleton */}
            <div className={`h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`} />
          </div>

          {/* Call to Action button skeleton */}
          <div className="mt-8 pt-6 border-t-[3px] border-gray-300 dark:border-gray-600">
            <div className={`h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`} />
          </div>
        </div>
      </div>
      {/* Faux drop shadow */}
      <div className="absolute inset-0 bg-black dark:bg-white rounded-[32px] -z-10"></div>
    </div>
  );
}
