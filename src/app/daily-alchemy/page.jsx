'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SOUP_CONFIG } from '@/lib/daily-alchemy.constants';
import { DailyAlchemyGame, DailyAlchemyBackground } from '@/components/daily-alchemy';

/**
 * Get today's date in YYYY-MM-DD format based on ET timezone
 */
function getCurrentPuzzleDate() {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Daily Alchemy Page
 * Main route for the Daily Alchemy game
 * Supports: /daily-alchemy (today) or /daily-alchemy?date=YYYY-MM-DD (archive)
 */
export default function DailyAlchemyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get('date');

  const { user, loading: authLoading } = useAuth();
  const { isActive: hasSubscription, loading: subscriptionLoading } = useSubscription();

  const [showPaywall, setShowPaywall] = useState(false);

  // Subscription check for archive puzzles
  useEffect(() => {
    if (!authLoading && !subscriptionLoading && user) {
      const today = getCurrentPuzzleDate();
      const isArchiveRequest = dateParam && dateParam !== today;

      if (isArchiveRequest) {
        // Check if puzzle is within free window
        const puzzleDate = new Date(dateParam);
        const todayDate = new Date();
        const daysOld = Math.floor((todayDate - puzzleDate) / (1000 * 60 * 60 * 24));

        const needsSubscription = daysOld >= SOUP_CONFIG.FREE_ARCHIVE_DAYS && !hasSubscription;

        if (needsSubscription) {
          setShowPaywall(true);
        }
      }
    }
  }, [user, hasSubscription, dateParam, authLoading, subscriptionLoading]);

  // Paywall state for old archive puzzles
  if (showPaywall) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <DailyAlchemyBackground />
        <div
          className="
            max-w-md w-full
            rounded-[32px]
            border-[3px] border-black dark:border-gray-600
            shadow-[6px_6px_0px_rgba(0,0,0,1)]
            dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]
            bg-ghost-white dark:bg-gray-800
            p-10
            text-center
          "
        >
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-text-primary mb-3">
            Archive Requires Membership
          </h1>
          <p className="text-text-secondary mb-6">
            Get unlimited access to all past Daily Alchemy puzzles, plus the full archive of Tandem,
            Mini, and Cryptic games.
          </p>

          <div className="space-y-2 mb-8 text-left">
            <div className="flex items-start gap-3">
              <span className="text-soup-primary text-xl">✓</span>
              <p className="text-sm text-text-primary">Play all past Daily Alchemy puzzles</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-soup-primary text-xl">✓</span>
              <p className="text-sm text-text-primary">
                Access full Tandem, Mini & Cryptic archives
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-soup-primary text-xl">✓</span>
              <p className="text-sm text-text-primary">Sync stats across all devices</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-soup-primary text-xl">✓</span>
              <p className="text-sm text-text-primary">Support independent development</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/subscription')}
              className="
                w-full h-14
                rounded-[20px]
                border-[3px] border-black dark:border-gray-600
                shadow-[4px_4px_0px_rgba(0,0,0,1)]
                dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                bg-soup-primary dark:bg-soup-primary
                text-white
                font-black
                tracking-wider
                uppercase
                hover:translate-x-[2px] hover:translate-y-[2px]
                hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                active:translate-x-[4px] active:translate-y-[4px]
                active:shadow-none
                transition-all
              "
            >
              Subscribe Now
            </button>
            <button
              onClick={() => router.push('/daily-alchemy')}
              className="
                w-full h-12
                rounded-[16px]
                border-[3px] border-black dark:border-gray-600
                shadow-[3px_3px_0px_rgba(0,0,0,1)]
                dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                bg-ghost-white dark:bg-gray-700
                text-text-primary
                font-bold
                hover:translate-x-[2px] hover:translate-y-[2px]
                hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                active:translate-x-[3px] active:translate-y-[3px]
                active:shadow-none
                transition-all
              "
            >
              Play Today's Puzzle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <DailyAlchemyGame initialDate={dateParam} />;
}
