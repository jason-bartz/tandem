'use client';
import { useEffect, useState } from 'react';
import { useGameWithInitialData } from '@/hooks/useGameWithInitialData';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/hooks/useSound';
import { useHaptics } from '@/hooks/useHaptics';
import { useMidnightRefresh } from '@/hooks/useMidnightRefresh';
import { useDeviceType } from '@/lib/deviceDetection';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarPrompt } from '@/hooks/useAvatarPrompt';
import { GAME_STATES, GAME_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import WelcomeScreen from './WelcomeScreen';
import PlayingScreen from './PlayingScreen';
import CompleteScreen from './CompleteScreen';
import AdmireScreen from './AdmireScreen';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import AnimatedLoadingMessage from '@/components/shared/AnimatedLoadingMessage';
import WelcomeScreenSkeleton from '@/components/shared/WelcomeScreenSkeleton';
import VersionChecker from '@/components/shared/VersionChecker';
import AchievementToast from './AchievementToast';
import AvatarSelectionModal from '@/components/AvatarSelectionModal';
import AvatarPromptModal from '@/components/AvatarPromptModal';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import notificationService from '@/services/notificationService';
import subscriptionService from '@/services/subscriptionService';
import gameCenterService from '@/services/gameCenter.service';

export default function GameContainerClient({ initialPuzzleData }) {
  const game = useGameWithInitialData(initialPuzzleData);
  const timer = useTimer(game.gameState === GAME_STATES.PLAYING && !game.hardModeTimeUp);
  const { theme, toggleTheme } = useTheme();
  const { playSound } = useSound();
  const { correctAnswer, incorrectAnswer } = useHaptics();
  const { isMobilePhone, isSmallPhone } = useDeviceType();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showFullAvatarModal, setShowFullAvatarModal] = useState(false);

  // Avatar prompt for first-time users (with 2-second delay for UX)
  const { showAvatarPrompt, dismissPrompt, closePrompt } = useAvatarPrompt(user, 2000);

  // Check if user has seen onboarding (iOS only)
  useEffect(() => {
    async function checkOnboarding() {
      try {
        // Only show onboarding on native iOS platform
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

  // Initialize subscription service and Game Center on app bootstrap (iOS only)
  // This runs ONCE when the app starts, ensuring subscription state and Game Center are ready
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      subscriptionService
        .initialize()
        .then(() => {})
        .catch((_error) => {
          // App continues to work even if subscription init fails
        });

      // Initialize Game Center (silent, non-blocking)
      gameCenterService
        .initialize()
        .then((success) => {
          if (success) {
          } else {
          }
        })
        .catch((_error) => {
          // App continues to work even if Game Center init fails
        });
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
      notificationService.onAppLaunch().catch((_err) => {});
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
    // or if not completed, will set up for fresh play
    const success = await game.loadPuzzle(date);
    if (success) {
      // Reset timer when loading a new puzzle
      timer.reset();
      // Don't auto-start if we entered admire mode or if admireData exists
      // Only auto-start for incomplete archive puzzles
      if (game.gameState === GAME_STATES.WELCOME && !game.admireData) {
        game.startGame();
      }
    }
  };

  // Show loading while checking onboarding status or loading game
  if (!onboardingChecked || game.loading) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-bg-primary">
        <div className="min-h-screen flex items-center justify-center py-6">
          <div className="w-full max-w-xl mx-auto p-6 relative z-10 my-auto">
            {/* Loading skeleton */}
            <WelcomeScreenSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding flow if user hasn't seen it yet
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
    <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-bg-primary">
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

      {/* Avatar Prompt Modal - Small preview with action buttons */}
      {/* Only shown after onboarding completes and game loads */}
      {onboardingChecked && !showOnboarding && showAvatarPrompt && user && !showFullAvatarModal && (
        <AvatarPromptModal
          isOpen={showAvatarPrompt}
          onSelectAvatar={() => setShowFullAvatarModal(true)}
          onSkip={() => dismissPrompt()}
        />
      )}

      {/* Full Avatar Selection Modal */}
      {showFullAvatarModal && user && (
        <AvatarSelectionModal
          isOpen={showFullAvatarModal}
          onClose={(avatarId) => {
            setShowFullAvatarModal(false);
            if (avatarId) {
              // Avatar selected
              closePrompt();
            }
            // If closed without selecting, user can still see prompt modal again
          }}
          userId={user.id}
          isFirstTime={true}
        />
      )}
    </div>
  );
}
