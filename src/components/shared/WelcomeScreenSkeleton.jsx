'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import GlobalNavigation from '@/components/navigation/GlobalNavigation';

const loadingMessages = [
  'Calibrating cryptic coefficients...',
  'Syncing synonyms...',
  'Balancing tandem handlebars...',
  'Herding metaphorical cats...',
  'Brewing fresh vocabulary...',
  'Untangling thematic threads...',
  'Optimizing wordplay algorithms...',
  'Reticulating syllables...',
  'Consulting the emoji oracle...',
];

export default function WelcomeScreenSkeleton() {
  const { reduceMotion, highContrast } = useTheme();
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeoutId = null;

    // Rotate through loading messages
    const interval = setInterval(() => {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setLoadingText(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        setIsVisible(true);
      }, 300);
    }, 2000); // Increased to 2 seconds for better readability

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <GlobalNavigation
      onOpenStats={() => {}}
      onOpenArchive={() => {}}
      onOpenHowToPlay={() => {}}
      onOpenSettings={() => {}}
    >
      <div className="animate-fade-in px-2 -mt-[52px]">
        {/* Main Daily Tandem card skeleton */}
        <div
          className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center mb-6 relative ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Loading text centered in card */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              <p className="text-base font-bold text-gray-800 dark:text-gray-200 text-center">
                {loadingText}
              </p>
            </div>
          </div>
          {/* Logo skeleton - shown on desktop, hidden on mobile native */}
          <div className="w-24 h-24 mx-auto mb-5">
            <div
              className={`w-full h-full bg-gray-200 dark:bg-gray-700 rounded-2xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Title skeleton */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <div
              className={`h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Puzzle number and date skeleton */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div
              className={`h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Info section skeleton */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start">
                  <div
                    className={`w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mr-3 flex-shrink-0 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{
                      animationDelay: !reduceMotion ? `${i * 100}ms` : '0ms',
                    }}
                  />
                  <div
                    className={`h-5 flex-1 bg-gray-200 dark:bg-gray-700 rounded mt-2.5 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
                    style={{
                      animationDelay: !reduceMotion ? `${i * 100 + 50}ms` : '0ms',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Play button skeleton */}
          <div
            className={`h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-[20px] ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>

        {/* Cryptic Welcome Card skeleton */}
        <div
          className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center mb-6 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Logo skeleton */}
          <div className="w-24 h-24 mx-auto mb-5">
            <div
              className={`w-full h-full bg-gray-200 dark:bg-gray-700 rounded-2xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Title skeleton */}
          <div className="mb-4 flex flex-col items-center gap-2">
            <div
              className={`h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Puzzle number skeleton */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div
              className={`h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>

          {/* Clue preview skeleton */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6">
            <div className="space-y-3">
              <div
                className={`h-5 w-3/4 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-5 w-2/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
          </div>

          {/* Play button skeleton */}
          <div
            className={`h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-[20px] ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>
      </div>
    </GlobalNavigation>
  );
}
