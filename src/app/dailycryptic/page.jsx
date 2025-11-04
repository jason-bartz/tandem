'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useCrypticGame } from '@/hooks/useCrypticGame';
import { CRYPTIC_GAME_STATES } from '@/lib/constants';
import CrypticGameScreen from '@/components/cryptic/CrypticGameScreen';
import CrypticCompleteScreen from '@/components/cryptic/CrypticCompleteScreen';
import CrypticAuthModal from '@/components/cryptic/CrypticAuthModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

/**
 * The Daily Cryptic - Standalone cryptic word puzzle game
 * Daily puzzle available to all account holders (free)
 * Archive access requires Tandem Unlimited subscription
 * Supports date parameter for archive: /dailycryptic?date=2025-10-30
 */
export default function DailyCrypticPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const { user, loading: authLoading } = useAuth();
  const { isActive: hasSubscription, loading: subscriptionLoading } = useSubscription();
  const cryptic = useCrypticGame();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Determine if the request is for an archive puzzle (has date param)
  const isArchiveRequest = !!dateParam;

  // Show auth modal if not logged in instead of redirecting
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    } else if (user && cryptic.puzzle && cryptic.gameState === CRYPTIC_GAME_STATES.WELCOME) {
      // Auto-start the game if user is authenticated and puzzle is loaded
      cryptic.startGame();
    }
  }, [user, authLoading, cryptic.puzzle, cryptic.gameState]);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Refresh the page or reload puzzle after auth
    window.location.reload();
  };

  // Load specific date if provided in URL
  useEffect(() => {
    if (dateParam && cryptic.loadPuzzle) {
      cryptic.loadPuzzle(dateParam);
    }
  }, [dateParam]);

  // Show loading while checking auth and subscription
  if (authLoading || subscriptionLoading || cryptic.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
        <LoadingSpinner />
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              The Daily Cryptic
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sign in to play today's cryptic puzzle
            </p>
          </div>
        </div>

        <CrypticAuthModal
          isOpen={showAuthModal}
          onClose={() => router.push('/')}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // Paywall for archive access (requires subscription)
  // Daily puzzle is free for all (no paywall)
  if (!subscriptionLoading && isArchiveRequest && !hasSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-bg-card rounded-[32px] border-[3px] border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)] p-10 text-center">
          <div className="mb-6">
            <img
              src="/icons/ui/cryptic.png"
              alt="The Daily Cryptic"
              className="w-24 h-24 mx-auto rounded-xl"
            />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Archive Requires Tandem Unlimited
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            The daily puzzle is free for all account holders, but the archive is exclusive to Tandem Unlimited subscribers.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
            <h3 className="text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-4 font-semibold">
              What you get with Tandem Unlimited:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className="text-gray-800 dark:text-gray-200 pt-0.5">
                  Play all past puzzles in the archive for both Tandem emoji word puzzle and Daily Cryptic
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className="text-gray-800 dark:text-gray-200 pt-0.5">
                  Hard Mode for extra challenge
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className="text-gray-800 dark:text-gray-200 pt-0.5">
                  Sync and save your progress across devices
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-green text-xl mr-3 flex-shrink-0">✓</span>
                <span className="text-gray-800 dark:text-gray-200 pt-0.5">
                  Support a solo developer to keep building great puzzles
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-accent-green/10 border-2 border-accent-green/30 rounded-2xl p-4 mb-8 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              💚 Tandem Unlimited members keep the daily puzzle free for everyone to play!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => (window.location.href = '/account')}
              className="px-8 py-4 text-white text-lg font-bold rounded-[20px] border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
              style={{ backgroundColor: '#cb6ce6' }}
            >
              Subscribe Now
            </button>
            <button
              onClick={() => (window.location.href = '/dailycryptic')}
              className="px-8 py-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold rounded-[20px] border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Play Today's Puzzle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (cryptic.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <ErrorMessage
          title="Unable to Load Puzzle"
          message={cryptic.error}
          onRetry={() => cryptic.loadPuzzle()}
        />
      </div>
    );
  }

  // No puzzle available
  if (!cryptic.puzzle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Puzzle Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There is no puzzle available for today. Check back soon!
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Tandem
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
        {cryptic.gameState === CRYPTIC_GAME_STATES.PLAYING && (
          <CrypticGameScreen
            puzzle={cryptic.puzzle}
            userAnswer={cryptic.userAnswer}
            updateAnswer={cryptic.updateAnswer}
            checkAnswer={cryptic.checkAnswer}
            hintsUsed={cryptic.hintsUsed}
            unlockedHints={cryptic.unlockedHints}
            useHint={cryptic.useHint}
            getAvailableHints={cryptic.getAvailableHints}
            canUseHint={cryptic.canUseHint}
            elapsedTime={cryptic.elapsedTime}
            attempts={cryptic.attempts}
            onBack={() => router.push('/')}
          />
        )}

        {cryptic.gameState === CRYPTIC_GAME_STATES.COMPLETE && (
          <CrypticCompleteScreen
            puzzle={cryptic.puzzle}
            answer={cryptic.correctAnswer}
            userAnswer={cryptic.userAnswer}
            hintsUsed={cryptic.hintsUsed}
            elapsedTime={cryptic.elapsedTime}
            attempts={cryptic.attempts}
            currentPuzzleDate={cryptic.currentPuzzleDate}
            onPlayAgain={() => cryptic.loadPuzzle()}
            onReturnHome={() => (window.location.href = '/')}
          />
        )}
      </div>

      {/* Auth Modal - shows when user is not authenticated */}
      <CrypticAuthModal
        isOpen={showAuthModal}
        onClose={() => router.push('/')}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
