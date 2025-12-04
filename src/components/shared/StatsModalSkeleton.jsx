'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function StatsModalSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  return (
    <div className="px-6 py-4">
      {/* Tandem Stats Section */}
      <div className="mb-6">
        {/* Section Title */}
        <div
          className={`h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />

        {/* Summary Card Skeleton */}
        <div
          className={`rounded-2xl border-[3px] p-4 mb-4 ${
            highContrast
              ? 'bg-hc-primary border-hc-border'
              : 'bg-accent-blue dark:bg-accent-blue border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="flex justify-around items-center">
            <div className="text-center">
              <div
                className={`h-8 w-16 bg-ghost-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-3 w-12 bg-ghost-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
            <div className="w-px h-12 bg-ghost-white/30"></div>
            <div className="text-center">
              <div
                className={`h-8 w-16 bg-ghost-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-3 w-12 bg-ghost-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
            <div className="w-px h-12 bg-ghost-white/30"></div>
            <div className="text-center">
              <div
                className={`h-8 w-16 bg-ghost-white/20 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-3 w-12 bg-ghost-white/20 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={`tandem-${i}`}
              className={`rounded-2xl border-[3px] p-4 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-ghost-white dark:bg-gray-800 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div
                className={`h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100}ms` : '0ms',
                }}
              />
              <div
                className={`h-8 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100 + 50}ms` : '0ms',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mini Stats Section */}
      <div>
        {/* Section Title */}
        <div
          className={`h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />

        {/* Summary Card Skeleton */}
        <div
          className={`rounded-2xl border-[3px] p-4 mb-4 ${
            highContrast
              ? 'bg-hc-primary border-hc-border'
              : 'bg-accent-yellow dark:bg-accent-yellow border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="flex justify-around items-center">
            <div className="text-center">
              <div
                className={`h-8 w-16 bg-black/10 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-3 w-12 bg-black/10 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
            <div className="w-px h-12 bg-black/20"></div>
            <div className="text-center">
              <div
                className={`h-8 w-16 bg-black/10 rounded-lg mb-2 mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-3 w-12 bg-black/10 rounded mx-auto ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={`mini-${i}`}
              className={`rounded-2xl border-[3px] p-4 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-ghost-white dark:bg-gray-800 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div
                className={`h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100}ms` : '0ms',
                }}
              />
              <div
                className={`h-8 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{
                  animationDelay: !reduceMotion ? `${i * 100 + 50}ms` : '0ms',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
