'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { DailyAlchemyBackground } from './DailyAlchemyBackground';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * DailyAlchemyLoadingSkeleton - Loading skeleton for Element Soup game
 * Matches the structure of DailyAlchemyWelcomeScreen
 * On standalone, uses white background instead of green
 */
export function DailyAlchemyLoadingSkeleton() {
  const { highContrast, reduceMotion } = useTheme();

  const shimmerClass = !reduceMotion ? 'skeleton-shimmer' : '';

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col',
        isStandaloneAlchemy && 'bg-white dark:bg-gray-900'
      )}
    >
      {/* Background - green on main site, white on standalone */}
      <DailyAlchemyBackground />
      {/* Header Skeleton */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 pt-safe',
          isStandaloneAlchemy
            ? 'bg-white dark:bg-gray-900'
            : cn(
                'border-b-[3px]',
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-ghost-white dark:bg-bg-card border-border-main'
              )
        )}
      >
        <div className="max-w-2xl w-full mx-auto px-4">
          <div className="flex items-center justify-between h-[60px]">
            {/* Back button placeholder - empty space on standalone */}
            {isStandaloneAlchemy ? (
              <div className="w-8 h-8" />
            ) : (
              <div className={`w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 ${shimmerClass}`} />
            )}

            {/* Title placeholder */}
            <div className={`h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />

            {/* Menu placeholder */}
            <div className={`w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 ${shimmerClass}`} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-[calc(60px+env(safe-area-inset-top))] pb-safe overflow-auto">
        <div className="max-w-2xl w-full mx-auto px-4 py-6 flex flex-col items-center">
          {/* Hero Target Card Skeleton */}
          <div
            className={cn(
              'w-full max-w-sm p-5 mb-6',
              'bg-soup-light/50 dark:bg-soup-primary/10',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-2xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,1)]'
            )}
          >
            {/* Today's Target Label */}
            <div
              className={`h-3 w-24 mb-3 bg-soup-light dark:bg-soup-primary/40 rounded ${shimmerClass}`}
            />

            {/* Emoji + Title Row */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`}
              />
              <div
                className={`h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`}
                style={{ animationDelay: '50ms' }}
              />
            </div>

            {/* Par and Timer Display */}
            <div className="flex items-center gap-4">
              <div
                className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                style={{ animationDelay: '100ms' }}
              />
              <div
                className={`h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                style={{ animationDelay: '150ms' }}
              />
            </div>
          </div>

          {/* How to Play Section Skeleton */}
          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
              <div
                className={`h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                style={{ animationDelay: '50ms' }}
              />
            </div>

            <div
              className={cn(
                'p-4',
                'bg-gray-50 dark:bg-gray-800',
                'border-[3px] border-gray-300 dark:border-gray-600',
                'rounded-xl',
                'shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]'
              )}
            >
              <div
                className={`h-3 w-full mb-2 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
              />
              <div
                className={`h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                style={{ animationDelay: '50ms' }}
              />
            </div>
          </div>

          {/* Start Button Skeleton */}
          <div
            className={cn(
              'w-full max-w-sm h-14',
              'bg-soup-primary/50 dark:bg-soup-primary/30',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
              shimmerClass
            )}
          />

          {/* "or" Divider Skeleton */}
          <div className="w-full max-w-sm flex items-center gap-3 my-5">
            <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
            <div className={`h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
            <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Creative Mode Button Skeleton */}
          <div
            className={cn(
              'w-full max-w-sm h-14',
              'bg-white/50 dark:bg-gray-800/50',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(75,85,99,1)]',
              shimmerClass
            )}
          />

          {/* Creative Mode Description Skeleton */}
          <div className="w-full max-w-sm mt-3 px-4 flex flex-col items-center">
            <div
              className={`h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
              style={{ animationDelay: '50ms' }}
            />
          </div>

          {/* Discord Link Skeleton */}
          <div
            className={cn(
              'w-full max-w-sm mt-6 p-4',
              'flex items-center gap-3',
              'bg-gray-50 dark:bg-gray-800',
              'border-[3px] border-gray-300 dark:border-gray-600',
              'rounded-xl',
              'shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]'
            )}
          >
            {/* Discord Logo placeholder */}
            <div className={`w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
            {/* Text Content placeholder */}
            <div className="flex-1 min-w-0">
              <div
                className={`h-4 w-32 mb-1.5 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
              />
              <div
                className={`h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                style={{ animationDelay: '50ms' }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DailyAlchemyLoadingSkeleton;
