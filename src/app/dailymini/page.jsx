'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MINI_GAME_STATES } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import ServiceOutage from '@/components/shared/ServiceOutage';
import useMiniGame from '@/hooks/useMiniGame';
import MiniGameScreen from '@/components/mini/MiniGameScreen';
import MiniCompleteScreen from '@/components/mini/MiniCompleteScreen';
import MiniAdmireScreen from '@/components/mini/MiniAdmireScreen';
import AuthModal from '@/components/auth/AuthModal';
import MiniLoadingSkeleton from '@/components/mini/MiniLoadingSkeleton';

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
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize game with optional date
  const game = useMiniGame(dateParam);

  // Auth check - Mini requires free account (like Cryptic)
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    }
  }, [user, authLoading]);

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
    return <MiniLoadingSkeleton />;
  }

  // Error state
  if (game.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main dark:bg-bg-main px-4">
        <div
          className="
            max-w-md w-full
            rounded-lg
           
           
            dark:
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
              rounded-md
             
             
              dark:
              bg-accent-yellow dark:bg-accent-yellow
              text-gray-900
              font-black
              tracking-wider
              uppercase
             
              hover:
             
             
              transition-all
            "
          >
            Go Back
          </button>
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
