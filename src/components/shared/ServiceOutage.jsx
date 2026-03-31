'use client';

import { WifiOff } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ServiceOutage - Displayed when the backend (Supabase) is unreachable.
 * Shows immediately when auth detects the outage, rather than waiting
 * for individual API calls to time out.
 */
export default function ServiceOutage() {
  const { highContrast } = useTheme();

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-primary px-4">
      <div
        className={`rounded-3xl p-8 max-w-md text-center ${
          highContrast
            ? 'bg-hc-surface border-4 border-hc-border'
            : 'bg-ghost-white dark:bg-gray-800'
        }`}
      >
        <div className="mb-6 flex justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              highContrast ? 'bg-hc-warning' : 'bg-amber-100 dark:bg-amber-900/30'
            }`}
          >
            <WifiOff
              className={`w-10 h-10 ${
                highContrast ? 'text-hc-warning-text' : 'text-amber-600 dark:text-amber-400'
              }`}
            />
          </div>
        </div>
        <h2
          className={`text-xl font-bold mb-3 ${
            highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
          }`}
        >
          Temporarily Unavailable
        </h2>
        <p className={`mb-6 ${highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'}`}>
          Our database provider is experiencing a temporary outage, which is preventing our puzzles
          from loading. I apologize for the inconvenience. Check back shortly!
          <br />
          <br />- Jason, Puzzlemaster
        </p>
        <button
          onClick={() => window.location.reload()}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            highContrast
              ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border'
              : 'bg-sky-600 text-white hover:bg-sky-700'
          }`}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
