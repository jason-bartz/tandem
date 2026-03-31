'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * MiniLoadingSkeleton - Full-page skeleton for Daily Mini crossword
 * Mirrors the MiniGameScreen layout: header, timer bar, 5x5 grid, clue bar, keyboard
 */
export default function MiniLoadingSkeleton() {
  const { reduceMotion, highContrast } = useTheme();

  const shimmer = !reduceMotion ? 'skeleton-shimmer' : '';

  return (
    <div className="min-h-screen flex flex-col bg-bg-main dark:bg-bg-main">
      <div className="flex flex-col max-w-md w-full mx-auto pt-1 pt-safe-ios pb-[220px] px-4">
        <div
          className={`rounded-lg border-[3px] overflow-hidden flex flex-col ${
            highContrast
              ? 'bg-hc-surface border-hc-border'
              : 'bg-ghost-white dark:bg-bg-card border-border-main'
          }`}
        >
          {/* Header skeleton - back button, title, hamburger */}
          <header
            className={`pt-1 pb-1 px-3 sm:px-5 flex items-center justify-between ${
              highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-bg-card'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className={`h-5 w-36 rounded bg-gray-200 dark:bg-gray-700 ${shimmer}`} />
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </header>

          {/* Content area */}
          <div className="flex flex-col p-4 sm:p-6">
            {/* Timer and action buttons bar */}
            <div className="flex items-center justify-between mb-2">
              <div className={`h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 ${shimmer}`} />
              <div
                className={`h-6 w-20 rounded bg-gray-200 dark:bg-gray-700 ${shimmer}`}
                style={{ animationDelay: '100ms' }}
              />
              <div className={`h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 ${shimmer}`} />
            </div>

            {/* 5x5 crossword grid skeleton */}
            <div className="grid grid-cols-5 gap-0.5 my-3 aspect-square">
              {Array.from({ length: 25 }).map((_, i) => {
                // Make a few cells "black" (non-editable) to look realistic
                const blackCells = [4, 10, 14, 20];
                const isBlack = blackCells.includes(i);

                return (
                  <div
                    key={i}
                    className={`rounded-sm ${
                      isBlack
                        ? 'bg-gray-800 dark:bg-gray-900'
                        : `bg-gray-200 dark:bg-gray-700 ${shimmer}`
                    }`}
                    style={{
                      animationDelay: !reduceMotion ? `${Math.min(i, 4) * 100}ms` : '0ms',
                    }}
                  />
                );
              })}
            </div>

            {/* Clue bar skeleton */}
            <div
              className={`h-12 rounded-xl bg-gray-200 dark:bg-gray-700 mt-2 ${shimmer}`}
              style={{ animationDelay: '200ms' }}
            />
          </div>
        </div>

        {/* Keyboard skeleton */}
        <div className="mt-3 space-y-1.5">
          {[10, 9, 7].map((keys, row) => (
            <div key={row} className="flex justify-center gap-1">
              {Array.from({ length: keys }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-11 rounded-lg bg-gray-200 dark:bg-gray-700 ${shimmer}`}
                  style={{
                    animationDelay: !reduceMotion ? `${Math.min(i, 4) * 100}ms` : '0ms',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
