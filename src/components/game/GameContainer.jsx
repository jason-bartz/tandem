'use client';
import { useGame } from '@/hooks/useGame';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/hooks/useSound';
import { useMidnightRefresh } from '@/hooks/useMidnightRefresh';
import { GAME_STATES } from '@/lib/constants';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import logger from '@/lib/logger';

export default function GameContainer() {
  const game = useGame();
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING);
  const { theme, toggleTheme, isAuto, currentState } = useTheme();
  const { playSound } = useSound();

  // Auto-refresh puzzle at midnight ET
  useMidnightRefresh(() => {
    logger.info('Midnight detected, refreshing puzzle');
    // If not in the middle of playing, reload the puzzle
    if (game.gameState !== GAME_STATES.PLAYING) {
      game.loadPuzzle(null); // Load today's puzzle
    }
  });

  const handleCheckAnswers = () => {
    const result = game.checkAnswers();

    if (result.correct > 0) {
      playSound('correct');
    }
    if (result.incorrect > 0) {
      playSound('incorrect');
    }
  };

  const handleSelectPuzzle = async (date) => {
    // Load the selected puzzle (loadPuzzle handles resetting internally)
    const success = await game.loadPuzzle(date);
    if (success) {
      // Small delay to ensure state updates have propagated
      setTimeout(() => {
        game.startGame();
      }, 100);
    }
  };

  if (game.loading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-primary">
        <LoadingSpinner />
      </div>
    );
  }

  if (game.error) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md text-center mx-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Oops!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{game.error}</p>
          <button
            onClick={game.loadPuzzle}
            className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main container with solid background
  return (
    <div className={`fixed inset-0 w-full h-full overflow-auto bg-bg-primary ${theme}`}>
      <div className="min-h-screen flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md h-[90vh] sm:h-auto flex flex-col">
          {game.gameState === GAME_STATES.WELCOME && (
            <WelcomeScreen
              onStart={game.startGame}
              theme={theme}
              toggleTheme={toggleTheme}
              isAuto={isAuto}
              currentState={currentState}
              onSelectPuzzle={handleSelectPuzzle}
              puzzle={game.puzzle}
            />
          )}

          {game.gameState === GAME_STATES.PLAYING && (
            <PlayingScreen
              puzzle={game.puzzle}
              answers={game.answers}
              correctAnswers={game.correctAnswers}
              checkedWrongAnswers={game.checkedWrongAnswers}
              mistakes={game.mistakes}
              solved={game.solved}
              time={timer.elapsed}
              onUpdateAnswer={game.updateAnswer}
              onCheckAnswers={handleCheckAnswers}
              onCheckSingleAnswer={game.checkSingleAnswer}
              theme={theme}
              toggleTheme={toggleTheme}
              isAuto={isAuto}
              currentState={currentState}
              onSelectPuzzle={handleSelectPuzzle}
              hintsUsed={game.hintsUsed}
              hintedAnswers={game.hintedAnswers}
              unlockedHints={game.unlockedHints}
              activeHintIndex={game.activeHintIndex}
              onUseHint={game.useHint}
              hasCheckedAnswers={game.hasCheckedAnswers}
              onReturnToWelcome={game.resetGame}
            />
          )}

          {game.gameState === GAME_STATES.COMPLETE &&
            (() => {
              console.log('[GameContainer] Rendering CompleteScreen with:', {
                won: game.solved === 4,
                hintsUsed: game.hintsUsed,
                hintedAnswers: game.hintedAnswers,
                solved: game.solved,
              });
              return (
                <CompleteScreen
                  won={game.solved === 4}
                  time={timer.elapsed}
                  mistakes={game.mistakes}
                  correctAnswers={game.correctAnswers}
                  puzzle={game.puzzle}
                  puzzleTheme={game.puzzle?.theme}
                  onPlayAgain={game.resetGame}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  isAuto={isAuto}
                  currentState={currentState}
                  hintsUsed={game.hintsUsed || 0}
                  hintedAnswers={game.hintedAnswers || []}
                  onSelectPuzzle={handleSelectPuzzle}
                  onReturnToWelcome={game.resetGame}
                  difficultyRating={game.puzzle?.difficultyRating}
                />
              );
            })()}
        </div>
      </div>

      {/* Copyright notice - positioned at bottom */}
      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/60 text-xs">© 2025 Tandem</p>
      </div>
    </div>
  );
}
