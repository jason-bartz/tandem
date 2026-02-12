'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MINI_GAME_STATES, MINI_CONFIG } from '@/lib/constants';
import { getCurrentMiniPuzzleInfo } from '@/lib/miniUtils';
import { useAuth } from '@/contexts/AuthContext';
import ServiceOutage from '@/components/shared/ServiceOutage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import useMiniGame from '@/hooks/useMiniGame';
import MiniGameScreen from '@/components/mini/MiniGameScreen';
import MiniCompleteScreen from '@/components/mini/MiniCompleteScreen';
import MiniAdmireScreen from '@/components/mini/MiniAdmireScreen';
import AuthModal from '@/components/auth/AuthModal';

/**
 * Daily Mini Page
 * Main route for the Daily Mini crossword game
 * Supports: /dailymini (today) or /dailymini?date=YYYY-MM-DD (archive)
 */
export default function DailyMiniPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get('date');

  const { user, loading: authLoading, serviceUnavailable } = useAuth();
  const { isActive: hasSubscription, loading: subscriptionLoading } = useSubscription();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Initialize game with optional date
  const game = useMiniGame(dateParam);

  // Auth check - Mini requires free account (like Cryptic)
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    }
  }, [user, authLoading]);

  // Subscription check for archive puzzles
  useEffect(() => {
    if (!authLoading && !subscriptionLoading && user) {
      const isArchiveRequest = dateParam && dateParam !== getCurrentMiniPuzzleInfo().isoDate;

      if (isArchiveRequest) {
        // Check if puzzle is within free window (today + 3 days back = 4 total)
        const puzzleDate = new Date(dateParam);
        const today = new Date();
        const daysOld = Math.floor((today - puzzleDate) / (1000 * 60 * 60 * 24));

        const needsSubscription = daysOld >= MINI_CONFIG.FREE_ARCHIVE_DAYS && !hasSubscription;

        if (needsSubscription) {
          setShowPaywall(true);
        }
      }
    }
  }, [user, hasSubscription, dateParam, authLoading, subscriptionLoading]);

  // Handle auth modal close
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    // Redirect to home if they close without logging in
    router.push('/');
  };

  // Handle auth success
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Reload to fetch user-specific data
    window.location.reload();
  };

  // Service outage - show immediately without waiting for API timeouts
  if (serviceUnavailable) {
    return <ServiceOutage />;
  }

  // Loading state
  if (authLoading || game.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main dark:bg-bg-main">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-accent-yellow border-t-transparent animate-spin"></div>
          </div>
          <p className="text-text-secondary font-medium">Loading Daily Mini...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (game.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main dark:bg-bg-main px-4">
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
          <div className="mb-6">
            <Image
              src="/game/tandem/asleep.png"
              alt="Puzzlemaster asleep"
              width={120}
              height={120}
              className="mx-auto"
            />
          </div>
          <p className="text-text-secondary mb-6">{game.error}</p>
          <button
            onClick={() => router.push('/')}
            className="
              w-full h-14
              rounded-[20px]
              border-[3px] border-black dark:border-gray-600
              shadow-[4px_4px_0px_rgba(0,0,0,1)]
              dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
              bg-accent-yellow dark:bg-accent-yellow
              text-gray-900
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
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Paywall state (archive puzzle requires subscription)
  if (showPaywall) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main dark:bg-bg-main px-4">
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
            Get unlimited access to all past Daily Mini puzzles, plus the full archive of Tandem and
            Cryptic games.
          </p>

          <div className="space-y-2 mb-8 text-left">
            <div className="flex items-start gap-3">
              <span className="text-accent-green text-xl">✓</span>
              <p className="text-sm text-text-primary">Play all past Daily Mini puzzles</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent-green text-xl">✓</span>
              <p className="text-sm text-text-primary">Access full Tandem & Cryptic archives</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent-green text-xl">✓</span>
              <p className="text-sm text-text-primary">Sync stats across all devices</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent-green text-xl">✓</span>
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
                bg-accent-yellow dark:bg-accent-yellow
                text-gray-900
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
              onClick={() => router.push('/dailymini')}
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

  // Game state routing
  switch (game.gameState) {
    case MINI_GAME_STATES.WELCOME:
      // Redirect to home if in welcome state (shouldn't happen)
      router.push('/');
      return null;

    case MINI_GAME_STATES.START:
    case MINI_GAME_STATES.PLAYING:
      // Both START and PLAYING use MiniGameScreen
      // START state shows blurred overlay with "Ready to solve?" button
      return (
        <MiniGameScreen
          puzzle={game.puzzle}
          userGrid={game.userGrid}
          solutionGrid={game.solutionGrid}
          clueNumbers={game.clueNumbers}
          selectedCell={game.selectedCell}
          direction={game.direction}
          currentClue={game.currentClue}
          elapsedTime={game.elapsedTime}
          isPaused={game.isPaused}
          checksUsed={game.checksUsed}
          revealsUsed={game.revealsUsed}
          mistakes={game.mistakes}
          autoCheck={game.autoCheck}
          correctCells={game.correctCells}
          handleLetterInput={game.handleLetterInput}
          handleBackspace={game.handleBackspace}
          selectCell={game.selectCell}
          navigateToNextClue={game.navigateToNextClue}
          navigateToNextClueInSection={game.navigateToNextClueInSection}
          navigateToPreviousClue={game.navigateToPreviousClue}
          navigateToClue={game.navigateToClue}
          pauseGame={game.pauseGame}
          resumeGame={game.resumeGame}
          checkCell={game.checkCell}
          checkWord={game.checkWord}
          checkPuzzle={game.checkPuzzle}
          revealCell={game.revealCell}
          revealWord={game.revealWord}
          revealPuzzle={game.revealPuzzle}
          toggleAutoCheck={game.toggleAutoCheck}
          gameStarted={game.hasStarted}
          onStart={game.startGame}
        />
      );

    case MINI_GAME_STATES.COMPLETE:
      return (
        <MiniCompleteScreen
          puzzle={game.puzzle}
          userGrid={game.userGrid}
          elapsedTime={game.elapsedTime}
          checksUsed={game.checksUsed}
          revealsUsed={game.revealsUsed}
          mistakes={game.mistakes}
          currentPuzzleDate={game.currentPuzzleDate}
        />
      );

    case MINI_GAME_STATES.ADMIRE:
      // Show completed puzzle in read-only mode with replay option
      return (
        <MiniAdmireScreen
          puzzle={game.puzzle}
          userGrid={game.admireData?.grid || game.userGrid}
          solutionGrid={game.solutionGrid}
          clueNumbers={game.clueNumbers}
          elapsedTime={game.admireData?.timeTaken || game.elapsedTime}
          checksUsed={game.admireData?.checksUsed || game.checksUsed}
          revealsUsed={game.admireData?.revealsUsed || game.revealsUsed}
          mistakes={game.admireData?.mistakes || game.mistakes}
          currentPuzzleDate={game.currentPuzzleDate}
          onReplay={game.resetPuzzle}
        />
      );

    default:
      return null;
  }

  // Auth Modal
  return (
    <>
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={handleAuthModalClose}
          onSuccess={handleAuthSuccess}
          initialTab="signin"
        />
      )}
    </>
  );
}
