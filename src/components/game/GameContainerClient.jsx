'use client';
import { useEffect } from 'react';
import { useGameWithInitialData } from '@/hooks/useGameWithInitialData';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/hooks/useSound';
import { useHaptics } from '@/hooks/useHaptics';
import { useMidnightRefresh } from '@/hooks/useMidnightRefresh';
import { useDeviceType } from '@/lib/deviceDetection';
import { GAME_STATES } from '@/lib/constants';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import VersionChecker from '@/components/shared/VersionChecker';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import notificationService from '@/services/notificationService';
import subscriptionService from '@/services/subscriptionService';

export default function GameContainerClient({ initialPuzzleData }) {
  const game = useGameWithInitialData(initialPuzzleData);
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING);
  const { theme, toggleTheme } = useTheme();
  const { playSound } = useSound();
  const { correctAnswer, incorrectAnswer } = useHaptics();
  const { isMobilePhone, isSmallPhone } = useDeviceType();

  // Initialize subscription service on app bootstrap (iOS only)
  // This runs ONCE when the app starts, ensuring subscription state is ready
  useEffect(() => {
    console.log(
      '[GameContainerClient] Bootstrap useEffect - isNative:',
      Capacitor.isNativePlatform()
    );
    if (Capacitor.isNativePlatform()) {
      console.log('[GameContainerClient] Starting subscription service initialization');
      subscriptionService
        .initialize()
        .then(() => {
          console.log('[GameContainerClient] Subscription service initialized successfully');
          console.log('[GameContainerClient] Final state:', subscriptionService.getInitState());
        })
        .catch((error) => {
          console.error('[GameContainerClient] Subscription service initialization failed:', error);
          // App continues to work even if subscription init fails
        });
    }
  }, []);

  // Reset timer when puzzle changes or when returning to welcome screen
  useEffect(() => {
    if (game.gameState === GAME_STATES.WELCOME) {
      timer.reset();
    }
  }, [game.puzzle?.id, game.puzzle?.date, game.gameState, timer]);

  // Handle app lifecycle for timer pause/resume (Native apps)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener;

    const setupAppListener = async () => {
      listener = await CapApp.addListener('appStateChange', (state) => {
        if (game.gameState === GAME_STATES.PLAYING) {
          if (state.isActive) {
            // App came to foreground - resume timer
            timer.resume();
          } else {
            // App went to background - pause timer
            timer.pause();
          }
        }
      });
    };

    setupAppListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [game.gameState, timer]);

  // Handle visibility change for timer pause/resume (Web PWA)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const handleVisibilityChange = () => {
      if (game.gameState === GAME_STATES.PLAYING) {
        if (document.hidden) {
          // Tab became inactive - pause timer
          timer.pause();
        } else {
          // Tab became active - resume timer
          timer.resume();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [game.gameState, timer]);

  // Initialize notifications on app launch (iOS only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      notificationService.onAppLaunch().catch((err) => {
        console.error('Failed to initialize notifications:', err);
      });
    }
  }, []);

  // Auto-refresh puzzle at midnight ET for iOS app
  useMidnightRefresh(() => {
    // If not in the middle of playing, reload the puzzle
    if (game.gameState !== GAME_STATES.PLAYING) {
      // Force reload to get today's puzzle
      game.loadPuzzle(null);
    }
  });

  const handleCheckAnswers = () => {
    const result = game.checkAnswers();

    if (result.correct > 0) {
      playSound('correct');
      correctAnswer(); // Add haptic feedback for correct answers
    }
    if (result.incorrect > 0) {
      playSound('incorrect');
      incorrectAnswer(); // Add haptic feedback for incorrect answers
    }
  };

  const handleSelectPuzzle = async (date) => {
    const success = await game.loadPuzzle(date);
    if (success) {
      // Reset timer when loading a new puzzle
      timer.reset();
      // Start the game immediately after loading archive puzzle
      game.startGame();
    }
  };

  const backgroundImage =
    theme === 'dark' ? "url('/images/dark-mode-bg.webp')" : "url('/images/light-mode-bg.webp')";

  if (game.loading) {
    return (
      <div
        className="fixed inset-0 w-full h-full flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/light-mode-bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  if (game.error) {
    return (
      <div
        className="fixed inset-0 w-full h-full flex items-center justify-center"
        style={{
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
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

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden"
      style={{
        backgroundImage: backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Version checker for iOS app updates */}
      <VersionChecker />

      {/* Content container - centered scrollable layout for all devices */}
      <div className="min-h-screen flex items-center justify-center py-6">
        <div className="w-full max-w-xl mx-auto p-6 animate-fade-in relative z-10 my-auto">
          {game.gameState === GAME_STATES.WELCOME && (
            <WelcomeScreen
              onStart={game.startGame}
              theme={theme}
              toggleTheme={toggleTheme}
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
              onSelectPuzzle={handleSelectPuzzle}
              hintsUsed={game.hintsUsed}
              onUseHint={game.useHint}
              hasCheckedAnswers={game.hasCheckedAnswers}
              onReturnToWelcome={game.returnToWelcome}
              activeHints={game.activeHints}
              isMobilePhone={isMobilePhone}
              isSmallPhone={isSmallPhone}
            />
          )}

          {game.gameState === GAME_STATES.COMPLETE && (
            <CompleteScreen
              won={game.won}
              time={timer.elapsed}
              mistakes={game.mistakes}
              correctAnswers={game.solved}
              puzzle={game.puzzle}
              puzzleTheme={game.puzzle?.theme}
              onPlayAgain={game.resetGame}
              theme={theme}
              toggleTheme={toggleTheme}
              hintsUsed={game.hintsUsed}
              activeHints={game.hintPositionsUsed}
              onSelectPuzzle={handleSelectPuzzle}
              onReturnToWelcome={game.returnToWelcome}
            />
          )}
        </div>
      </div>
    </div>
  );
}
