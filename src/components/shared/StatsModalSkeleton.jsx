'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * Skeleton for a single stats section
 */
function SectionSkeleton({ themeColor, reduceMotion, highContrast, index }) {
  // Define theme-specific colors matching StatsSection
  const getBackgroundColors = () => {
    if (highContrast) {
      return 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]';
    }

    if (themeColor === 'blue') {
      return 'bg-sky-500 dark:bg-sky-600 border-black shadow-[4px_4px_0px_#000]';
    } else if (themeColor === 'yellow') {
      return 'bg-yellow-500 dark:bg-yellow-600 border-black shadow-[4px_4px_0px_#000]';
    } else if (themeColor === 'green') {
      return 'bg-soup-primary dark:bg-soup-hover border-black shadow-[4px_4px_0px_#000]';
    } else if (themeColor === 'red') {
      return 'bg-red-500 dark:bg-red-600 border-black shadow-[4px_4px_0px_#000]';
    }

    return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]';
  };

  // Skeleton shimmer overlay color based on theme
  const getShimmerColor = () => {
    if (themeColor === 'yellow') {
      return 'bg-black/10';
    }
    return 'bg-white/20';
  };

  return (
    <div className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${getBackgroundColors()}`}>
      {/* Section Header */}
      <div className="px-4 py-3">
        <div className="flex items-center">
          {/* Icon placeholder */}
          <div
            className={`w-6 h-6 rounded ${getShimmerColor()} mr-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            style={{ animationDelay: `${index * 200}ms` }}
          />
          {/* Title placeholder */}
          <div
            className={`h-6 w-32 rounded ${getShimmerColor()} ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            style={{ animationDelay: `${index * 200 + 50}ms` }}
          />
        </div>
      </div>

      {/* Section Content */}
      <div className="px-4 pb-4">
        {/* Stats Cards Grid - 4 columns like actual layout */}
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-xl p-2 text-center ${
                highContrast ? 'bg-hc-surface/50' : `${getShimmerColor()}`
              }`}
            >
              {/* Stat value */}
              <div
                className={`h-6 w-10 mx-auto rounded ${getShimmerColor()} mb-1 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{ animationDelay: `${index * 200 + i * 100}ms` }}
              />
              {/* Stat label */}
              <div
                className={`h-3 w-full rounded ${getShimmerColor()} ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{ animationDelay: `${index * 200 + i * 100 + 50}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StatsModalSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  if (isStandaloneAlchemy) {
    return (
      <>
        {/* Stats card (no header) */}
        <div
          className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-soup-primary dark:bg-soup-hover border-black shadow-[4px_4px_0px_#000]'
          }`}
        >
          <div className="px-4 pt-4 pb-4">
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl p-2 text-center ${
                    highContrast ? 'bg-hc-surface/50' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`h-6 w-10 mx-auto rounded bg-white/20 mb-1 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                  <div
                    className={`h-3 w-full rounded bg-white/20 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ animationDelay: `${i * 100 + 50}ms` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discoveries card */}
        <div
          className={`rounded-2xl border-[3px] overflow-hidden mb-4 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-gray-800 border-black shadow-[4px_4px_0px_#000]'
          }`}
        >
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{ animationDelay: '400ms' }}
                />
                <div
                  className={`h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                  style={{ animationDelay: '450ms' }}
                />
              </div>
              <div
                className={`h-7 w-10 rounded bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{ animationDelay: '500ms' }}
              />
            </div>
            <div
              className={`w-full h-11 rounded-[20px] border-[3px] ${
                highContrast
                  ? 'bg-hc-primary border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                  : 'bg-soup-primary/50 border-black shadow-[3px_3px_0px_#000]'
              } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              style={{ animationDelay: '550ms' }}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Daily Tandem Section (Blue) */}
      <SectionSkeleton
        themeColor="blue"
        reduceMotion={reduceMotion}
        highContrast={highContrast}
        index={0}
      />

      {/* Daily Mini Section (Yellow) */}
      <SectionSkeleton
        themeColor="yellow"
        reduceMotion={reduceMotion}
        highContrast={highContrast}
        index={1}
      />

      {/* Element Soup Section (Green) */}
      <SectionSkeleton
        themeColor="green"
        reduceMotion={reduceMotion}
        highContrast={highContrast}
        index={2}
      />

      {/* Reel Connections Section (Red) */}
      <SectionSkeleton
        themeColor="red"
        reduceMotion={reduceMotion}
        highContrast={highContrast}
        index={3}
      />

      {/* Action Buttons */}
      <div className="space-y-2 mt-4 pb-4">
        {/* View Achievements Button Skeleton */}
        <div
          className={`w-full h-12 rounded-[20px] border-[3px] ${
            highContrast
              ? 'bg-hc-primary border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]'
          } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          style={{ animationDelay: '800ms' }}
        />
      </div>
    </>
  );
}
