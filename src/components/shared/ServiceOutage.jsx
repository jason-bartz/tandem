'use client';

import { WifiOff } from 'lucide-react';

/**
 * ServiceOutage - Displayed when the backend (Supabase) is unreachable.
 * Shows immediately when auth detects the outage, rather than waiting
 * for individual API calls to time out.
 */
export default function ServiceOutage() {
  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-primary px-4">
      <div className="bg-ghost-white dark:bg-gray-800 rounded-3xl border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-8 max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Temporarily Unavailable
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Our database provider is experiencing a temporary outage, which is preventing our puzzles
          from loading. This is usually brief — check back in a few minutes!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
