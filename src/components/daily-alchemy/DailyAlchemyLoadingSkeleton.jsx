'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { DailyAlchemyBackground } from './DailyAlchemyBackground';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * DailyAlchemyLoadingSkeleton - Loading skeleton for Daily Alchemy game
 * Matches the exact structure of DailyAlchemyGame + DailyAlchemyWelcomeScreen
 * On standalone, uses white background instead of green
 */
export function DailyAlchemyLoadingSkeleton() {
  const { highContrast, reduceMotion } = useTheme();

  const shimmerClass = !reduceMotion ? 'skeleton-shimmer' : '';

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col overflow-hidden',
        isStandaloneAlchemy && 'bg-white dark:bg-gray-900'
      )}
      style={isStandaloneAlchemy ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
    >
      {/* Background - green on main site, white on standalone */}
      <DailyAlchemyBackground />

      {/* Main container - matches DailyAlchemyGame layout */}
      <div
        className={cn(
          'flex-1 flex flex-col max-w-md lg:max-w-4xl xl:max-w-5xl w-full mx-auto',
          !isStandaloneAlchemy && 'pt-4 pt-safe-ios'
        )}
      >
        {/* Card wrapper - matches DailyAlchemyGame */}
        <div
          className={cn(
            'flex-1 flex flex-col mx-4 mb-4 min-h-0',
            isStandaloneAlchemy
              ? 'rounded-none border-0'
              : cn(
                  'rounded-[32px] border-[3px]',
                  highContrast
                    ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                    : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                )
          )}
        >
          {/* Header skeleton - matches DailyAlchemyGame header */}
          <header
            className={cn(
              'pt-2 pb-1 px-3 sm:px-5 flex items-center justify-between flex-shrink-0',
              isStandaloneAlchemy
                ? 'pt-3'
                : cn(
                    'rounded-t-[29px]',
                    highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-bg-card'
                  )
            )}
          >
            {/* Back button placeholder */}
            {isStandaloneAlchemy ? (
              <div className="w-8 h-8 flex-shrink-0" />
            ) : (
              <div
                className={`w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 ${shimmerClass}`}
              />
            )}

            {/* Title placeholder */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />
            </div>

            {/* Hamburger menu placeholder */}
            <div
              className={`w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 ${shimmerClass}`}
            />
          </header>

          {/* Content area - matches DailyAlchemyGame content structure */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 p-4 sm:p-6 overflow-y-auto overflow-x-hidden scrollable">
              <div className="flex flex-col items-center w-full px-4 pb-8">
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
                    <div
                      className={`w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                    />
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

                {/* Co-op Mode Button Skeleton */}
                <div
                  className={cn(
                    'w-full max-w-sm h-14 mb-3',
                    'bg-indigo-500/50 dark:bg-indigo-500/30',
                    'border-[3px] border-black dark:border-gray-600',
                    'rounded-xl',
                    'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                    shimmerClass
                  )}
                />

                {/* Co-op Mode Description Skeleton */}
                <div className="w-full max-w-sm mb-3 px-4 flex flex-col items-center">
                  <div
                    className={`h-3 w-3/5 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
                    style={{ animationDelay: '50ms' }}
                  />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyAlchemyLoadingSkeleton;
