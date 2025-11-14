'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

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

export default function CrypticWelcomeScreenSkeleton() {
  const { reduceMotion, highContrast } = useTheme();
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Rotate through loading messages
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setLoadingText(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        setIsVisible(true);
      }, 300);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 -mt-16">
      <div className="max-w-md w-full relative">
        {/* Loading text centered over the card */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div
            className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <p className="text-base font-bold text-gray-800 dark:text-gray-200 text-center px-4">
              {loadingText}
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div
              className={`w-20 h-20 mx-auto rounded-2xl bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
          <div
            className={`h-9 w-48 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
          <div
            className={`h-6 w-40 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
          <div
            className={`h-6 w-56 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>

        {/* Puzzle Preview Card */}
        <div
          className={`rounded-[32px] border-[3px] p-8 mb-6 ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="text-center mb-8">
            <div
              className={`h-7 w-36 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div className="space-y-2">
              <div
                className={`h-8 w-3/4 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`h-8 w-2/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 items-center">
            {/* Start Puzzle Button */}
            <div
              className={`h-14 w-full max-w-sm bg-gray-200 dark:bg-gray-700 rounded-[20px] ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />

            {/* Archive and How to Play Buttons */}
            <div className="flex gap-3 w-full max-w-sm">
              <div
                className={`flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-[16px] ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
              <div
                className={`flex-1 h-11 bg-gray-200 dark:bg-gray-700 rounded-[16px] ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
              />
            </div>
          </div>

          {/* Free access note */}
          <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
            <div
              className={`h-4 w-3/4 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-4 w-2/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>

        {/* Back to Tandem */}
        <div className="text-center">
          <div
            className={`h-5 w-32 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
