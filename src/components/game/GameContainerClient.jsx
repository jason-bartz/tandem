'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useGameWithInitialData } from '@/hooks/useGameWithInitialData';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/hooks/useSound';
import { useHaptics } from '@/hooks/useHaptics';
import { useMidnightRefresh } from '@/hooks/useMidnightRefresh';
import { useDeviceType } from '@/lib/deviceDetection';
import { GAME_STATES, GAME_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import AdmireScreen from './AdmireScreen';
import WelcomeScreenSkeleton from '@/components/shared/WelcomeScreenSkeleton';
import VersionChecker from '@/components/shared/VersionChecker';
import AchievementToast from './AchievementToast';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import notificationService from '@/services/notificationService';
import subscriptionService from '@/services/subscriptionService';
import { isStandaloneAlchemy } from '@/lib/standalone';
// gameCenterService removed - Game Center integration deprecated

// Standalone redirect component - prevents any Tandem game hooks from running
function StandaloneRedirect() {
  useEffect(() => {
    window.location.replace('/daily-alchemy');
  }, []);
  return <div className="fixed inset-0 bg-white dark:bg-gray-900" />;
}

export default function GameContainerClient({ initialPuzzleData }) {
  // On standalone, show blank white screen and redirect immediately
  // This prevents yellow Tandem background from ever flashing
  if (isStandaloneAlchemy) {
    return <StandaloneRedirect />;
  }

  return <TandemGameContainer initialPuzzleData={initialPuzzleData} />;
}

function TandemGameContainer({ initialPuzzleData }) {
  const searchParams = useSearchParams();
  const game = useGameWithInitialData(initialPuzzleData);
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING && !game.hardModeTimeUp);
  const { theme, toggleTheme } = useTheme();
  const { playSound } = useSound();
  const { correctAnswer, incorrectAnswer } = useHaptics();
  const { isMobilePhone, isSmallPhone } = useDeviceType();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Load archive puzzle from URL date parameter
  const { loadPuzzle } = game;
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && loadPuzzle) {
      // Load the archive puzzle for the specified date
      loadPuzzle(dateParam);
    }
  }, [searchParams, loadPuzzle]);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        if (!Capacitor.isNativePlatform()) {
          setShowOnboarding(false);
          setOnboardingChecked(true);
          return;
        }

        const result = await Preferences.get({ key: STORAGE_KEYS.HAS_SEEN_ONBOARDING });
        const hasSeenOnboarding = result.value === 'true';

        setShowOnboarding(!hasSeenOnboarding);
        setOnboardingChecked(true);
      } catch (error) {
        // Default to showing onboarding if check fails on native platform
        setShowOnboarding(true);
        setOnboardingChecked(true);
      }
    }

    checkOnboarding();
  }, []);

  // This runs ONCE when the app starts, ensuring subscription state and Game Center are ready
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      subscriptionService
        .initialize()
        .then(() => {})
        .catch((_error) => {
          // App continues to work even if subscription init fails
        });

      // Game Center initialization removed - deprecated
    }
  }, []);

  // Load hard mode preference when component mounts
  useEffect(() => {
    const hardModeEnabled = localStorage.getItem(STORAGE_KEYS.HARD_MODE) === 'true';
    game.setIsHardMode(hardModeEnabled);

    // Listen for hard mode changes from settings
    const handleHardModeChange = (event) => {
      game.setIsHardMode(event.detail);
    };

    window.addEventListener('hardModeChanged', handleHardModeChange);
    return () => {
      window.removeEventListener('hardModeChanged', handleHardModeChange);
    };
  }, [game]);

  // Reset timer when puzzle changes or when returning to welcome screen
  useEffect(() => {
    if (game.gameState === GAME_STATES.WELCOME) {
      timer.reset();
      game.setHardModeTimeUp(false);
    }
  }, [game.puzzle?.id, game.puzzle?.date, game.gameState, timer, game]);

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

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      notificationService.onAppLaunch().catch((_err) => {});
    }
  }, []);

  useMidnightRefresh(() => {
    // If not in the middle of playing, reload the puzzle
    if (game.gameState !== GAME_STATES.PLAYING) {
      // Force reload to get today's puzzle
      game.loadPuzzle(null);
    }
  });

  // Hard Mode timer check - fail game after 2 minutes
  useEffect(() => {
    if (game.isHardMode && game.gameState === GAME_STATES.PLAYING && !game.hardModeTimeUp) {
      if (timer.elapsed >= GAME_CONFIG.HARD_MODE_TIME_LIMIT) {
        // Time's up in hard mode
        game.setHardModeTimeUp(true);
        game.endGame(false); // End game as failure
        playSound('incorrect');
        incorrectAnswer(); // Haptic feedback for failure
      }
    }
  }, [
    timer.elapsed,
    game.isHardMode,
    game.gameState,
    game.hardModeTimeUp,
    game,
    playSound,
    incorrectAnswer,
  ]);

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
    // Load the selected puzzle
    // loadPuzzle will auto-detect if completed and enter admire mode
    // or if not completed, will enter playing mode directly (no welcome screen for archive)
    const success = await game.loadPuzzle(date);
    if (success) {
      // Reset timer when loading a new puzzle
      timer.reset();
    }
  };

  if (!onboardingChecked || game.loading) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-bg-primary">
        <div className="min-h-screen flex items-center justify-center py-6 px-4">
          <div className="w-full max-w-md mx-auto relative z-10 my-auto">
            {/* Loading skeleton */}
            <WelcomeScreenSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 w-full h-full bg-bg-primary">
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
          }}
        />
      </div>
    );
  }

  if (game.error) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="bg-ghost-white dark:bg-gray-800 rounded-3xl p-8 max-w-md text-center mx-4">
          <div className="mb-6">
            <Image
              src="/images/tandem_asleep.png"
              alt="Puzzlemaster asleep"
              width={120}
              height={120}
              className="mx-auto"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{game.error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Use blue background for playing, complete, and admire states; yellow for welcome
  const bgClass = game.gameState === GAME_STATES.WELCOME ? 'bg-bg-primary' : 'bg-bg-tandem';

  return (
    <div className={`fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden ${bgClass}`}>
      {/* Version checker for iOS app updates */}
      <VersionChecker />
      <AchievementToast />

      {/* Content container - centered scrollable layout for all devices */}
      <div className="min-h-screen flex items-center justify-center py-6 px-4">
        <div className="w-full max-w-md mx-auto relative z-10 my-auto">
          {/* Welcome screen */}
          {game.gameState === GAME_STATES.WELCOME && (
            <div key="welcome">
              <WelcomeScreen
                onStart={game.startGame}
                theme={theme}
                toggleTheme={toggleTheme}
                onSelectPuzzle={handleSelectPuzzle}
                puzzle={game.puzzle}
              />
            </div>
          )}

          {/* Playing screen - no animation, instant load */}
          {game.gameState === GAME_STATES.PLAYING && (
            <div key="playing">
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
                hintedAnswers={game.hintedAnswers}
                unlockedHints={game.unlockedHints}
                activeHintIndex={game.activeHintIndex}
                lockedLetters={game.lockedLetters}
                onUseHint={game.useHint}
                hasCheckedAnswers={game.hasCheckedAnswers}
                onReturnToWelcome={game.returnToWelcome}
                game={game}
                isMobilePhone={isMobilePhone}
                isSmallPhone={isSmallPhone}
                isHardMode={game.isHardMode}
                hardModeTimeLimit={GAME_CONFIG.HARD_MODE_TIME_LIMIT}
              />
            </div>
          )}

          {game.gameState === GAME_STATES.ADMIRE && (
            <div key="admire" className="animate-screen-enter">
              <AdmireScreen
                puzzle={game.puzzle}
                admireData={game.admireData}
                onReplay={game.replayFromAdmire}
                onSelectPuzzle={handleSelectPuzzle}
                onReturnToWelcome={game.returnToWelcome}
                theme={theme}
              />
            </div>
          )}

          {game.gameState === GAME_STATES.COMPLETE && (
            <div key="complete" className="animate-screen-enter">
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
                hintedAnswers={game.hintedAnswers}
                onSelectPuzzle={handleSelectPuzzle}
                onReturnToWelcome={game.returnToWelcome}
                isHardMode={game.isHardMode}
                hardModeTimeUp={game.hardModeTimeUp}
                difficultyRating={game.puzzle?.difficultyRating}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
