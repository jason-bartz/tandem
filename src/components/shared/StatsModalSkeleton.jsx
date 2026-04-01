'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * Skeleton for a single stats section
 */
function SectionSkeleton({ themeColor, reduceMotion, highContrast, index }) {
  // Left accent border color per game (matches StatsSection)
  const getAccentBorder = () => {
    if (highContrast) return 'border-l-hc-border';
    if (themeColor === 'blue') return 'border-l-sky-500';
    if (themeColor === 'yellow') return 'border-l-yellow-500';
    if (themeColor === 'green') return 'border-l-soup-primary';
    if (themeColor === 'red') return 'border-l-red-500';
    return 'border-l-gray-300';
  };

  const shimmer = 'bg-gray-200 dark:bg-gray-700';

  return (
    <div
      className={`rounded-lg overflow-hidden mb-4 border-l-4 ${getAccentBorder()} ${
        highContrast ? 'bg-hc-surface' : 'bg-bg-surface dark:bg-gray-800'
      }`}
    >
      {/* Section Header */}
      <div className="px-4 py-3">
        <div className="flex items-center">
          {/* Icon placeholder */}
          <div
            className={`w-6 h-6 rounded ${shimmer} mr-2 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            style={{ animationDelay: `${index * 200}ms` }}
          />
          {/* Title placeholder */}
          <div
            className={`h-6 w-32 rounded ${shimmer} ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            style={{ animationDelay: `${index * 200 + 50}ms` }}
          />
        </div>
      </div>

      {/* Section Content */}
      <div className="px-4 pb-4">
        {/* Stats Cards Grid - 4 columns like actual layout */}
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              {/* Stat value */}
              <div
                className={`h-7 w-12 mx-auto rounded ${shimmer} mb-1 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                style={{ animationDelay: `${index * 200 + i * 100}ms` }}
              />
              {/* Stat label */}
              <div
                className={`h-3 w-full rounded ${shimmer} ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
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
    const shimmer = 'bg-gray-200 dark:bg-gray-700';

    return (
      <>
        {/* Stats card (no header) */}
        <div
          className={`rounded-lg overflow-hidden mb-4 border-l-4 border-l-soup-primary ${
            highContrast ? 'bg-hc-surface' : 'bg-bg-surface dark:bg-gray-800'
          }`}
        >
          <div className="px-4 pt-4 pb-4">
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div
                    className={`h-7 w-12 mx-auto rounded ${shimmer} mb-1 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                  <div
                    className={`h-3 w-full rounded ${shimmer} ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{ animationDelay: `${i * 100 + 50}ms` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discoveries card */}
        <div
          className={`rounded-lg overflow-hidden mb-4 ${
            highContrast ? 'bg-hc-surface border border-hc-border' : 'bg-bg-card dark:bg-gray-800'
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
              className={`w-full h-11 rounded-md ${
                highContrast ? 'bg-hc-primary border border-hc-border' : 'bg-soup-primary/50'
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
          className={`w-full h-12 rounded-md ${
            highContrast ? 'bg-hc-primary border border-hc-border' : 'bg-bg-card'
          } ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          style={{ animationDelay: '800ms' }}
        />
      </div>
    </>
  );
}
