'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const LOADING_MESSAGES = [
  'Heating up the elements...',
  'Stirring the primordial soup...',
  'Gathering molecules...',
  'Mixing the ingredients...',
  'Calibrating combinations...',
  'Preparing the cauldron...',
  'Summoning atoms...',
  'Brewing discoveries...',
  'Aligning particles...',
  'Charging the reactor...',
];

/**
 * ElementSoupLoadingSkeleton - Loading skeleton for Element Soup game
 * Matches the structure of ElementSoupWelcomeScreen
 */
export function ElementSoupLoadingSkeleton() {
  const { highContrast, reduceMotion } = useTheme();
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Shuffle messages on mount for random order
    const shuffled = [...LOADING_MESSAGES].sort(() => Math.random() - 0.5);
    setMessages(shuffled);
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    let timeoutId = null;

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        // Change to next message in shuffled order
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % messages.length;
          // If we've cycled through all messages, reshuffle
          if (nextIndex === 0) {
            const reshuffled = [...messages].sort(() => Math.random() - 0.5);
            setMessages(reshuffled);
          }
          return nextIndex;
        });
        // Fade back in
        setIsVisible(true);
      }, 150);
    }, 2000);

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messages]);

  const shimmerClass = !reduceMotion ? 'skeleton-shimmer' : '';

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col',
        'bg-soup-green dark:bg-gray-900',
        highContrast && 'bg-hc-background'
      )}
    >
      {/* Header Skeleton */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 pt-safe border-b-[3px]',
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-ghost-white dark:bg-bg-card border-border-main'
        )}
      >
        <div className="max-w-2xl w-full mx-auto px-4">
          <div className="flex items-center justify-between h-[60px]">
            {/* Back button placeholder */}
            <div className={`w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 ${shimmerClass}`} />

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
              'bg-soup-light/50 dark:bg-soup-primary/20',
              'border-[3px] border-gray-300 dark:border-gray-600',
              'rounded-2xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,0.2)]'
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

            {/* Par Display */}
            <div
              className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
              style={{ animationDelay: '100ms' }}
            />
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
                'bg-soup-light/30 dark:bg-soup-primary/10',
                'border-2 border-soup-light dark:border-soup-primary/30',
                'rounded-xl'
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
              'border-[3px] border-gray-300 dark:border-gray-600',
              'rounded-xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,0.2)]',
              shimmerClass
            )}
          />

          {/* "or" Divider Skeleton */}
          <div className="w-full max-w-sm flex items-center gap-3 my-5">
            <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
            <div className={`h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
            <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Free Play Button Skeleton */}
          <div
            className={cn(
              'w-full max-w-sm h-14',
              'bg-white/50 dark:bg-gray-800/50',
              'border-[3px] border-gray-300 dark:border-gray-600',
              'rounded-xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,0.2)]',
              shimmerClass
            )}
          />

          {/* Free Play Description Skeleton */}
          <div className="w-full max-w-sm mt-3 px-4 flex flex-col items-center">
            <div
              className={`h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
              style={{ animationDelay: '50ms' }}
            />
          </div>
        </div>
      </main>

      {/* Centered Loading Message */}
      <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div
          className={cn(
            'bg-white dark:bg-gray-800',
            'rounded-2xl',
            'border-[3px] border-soup-primary',
            'shadow-[6px_6px_0px_rgba(0,0,0,0.3)]',
            'px-8 py-6',
            'text-center',
            'mx-4'
          )}
        >
          <p
            className={cn(
              'text-gray-800 dark:text-white text-lg font-bold',
              'transition-opacity duration-150',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {messages[currentIndex] || 'Loading...'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ElementSoupLoadingSkeleton;
