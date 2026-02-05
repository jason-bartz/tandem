/* eslint-disable no-console */
'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  formatTime,
  getCurrentPuzzleInfo,
  generateShareText,
  formatDateShort,
  getRandomCongratulation,
} from '@/lib/utils';
import { playSuccessSound } from '@/lib/sounds';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from './UnifiedArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import RevealAnswersModal from './RevealAnswersModal';
import ShareButton from './ShareButton';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useDeviceType } from '@/lib/deviceDetection';
import { ASSET_VERSION } from '@/lib/constants';
import Settings from '@/components/Settings';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import GlobalNavigation from '@/components/navigation/GlobalNavigation';
import LoginReminderPopup from '@/components/shared/LoginReminderPopup';

import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';

export default function CompleteScreen({
  won,
  time,
  mistakes,
  correctAnswers,
  puzzle,
  puzzleTheme,
  _onPlayAgain,
  theme,
  _isAuto,
  _currentState,
  hintsUsed,
  hintedAnswers = [],
  onSelectPuzzle,
  onReturnToWelcome,
  isHardMode = false,
  hardModeTimeUp = false,
  difficultyRating = null,
}) {
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRevealAnswers, setShowRevealAnswers] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(true);
  const [congratsMessage, setCongratsMessage] = useState('');
  const { celebration, lightTap } = useHaptics();
  const { highContrast, reduceMotion } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const { isMobilePhone } = useDeviceType();
  const { user, loading: authLoading } = useAuth();

  // Get the actual puzzle date (from the puzzle object for archive games, or current for today's)
  const puzzleDate = puzzle?.date || getCurrentPuzzleInfo().isoDate;

  // Generate share text - map hint positions correctly
  // hintedAnswers is an array of puzzle indices that received hints (e.g., [0, 2])
  // We pass this directly to generateShareText which expects an array of indices
  const hintPositions = hintedAnswers || [];

  const shareText = generateShareText(
    puzzleDate,
    puzzleTheme || 'Tandem Puzzle',
    time,
    mistakes,
    hintsUsed,
    hintPositions,
    won ? 4 : correctAnswers || 0,
    isHardMode,
    hardModeTimeUp,
    difficultyRating
  );

  useEffect(() => {
    if (won) {
      setCongratsMessage(getRandomCongratulation());

      // Play success sound and trigger celebration haptics
      try {
        playSuccessSound();
        celebration(); // Trigger haptic celebration pattern
      } catch (e) {
        // Sound might fail on some browsers
      }

      // Trigger confetti with sky/teal theme colors (only if reduce motion is disabled)
      if (!reduceMotion) {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        function randomInRange(min, max) {
          return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);

          // Sky and teal colored confetti
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#0EA5E9', '#14B8A6', '#06B6D4', '#22D3EE', '#2DD4BF', '#5EEAD4'],
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#0EA5E9', '#14B8A6', '#06B6D4', '#22D3EE', '#2DD4BF', '#5EEAD4'],
          });
        }, 250);

        return () => clearInterval(interval);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  return (
    <GlobalNavigation
      onOpenStats={() => setShowPlayerStats(true)}
      onOpenArchive={() => setShowArchive(true)}
      onOpenHowToPlay={() => setShowHowToPlay(true)}
      onOpenSettings={() => setShowSettings(true)}
      onOpenLeaderboard={() => setShowLeaderboard(true)}
    >
      {/* Login reminder popup for non-authenticated users who won */}
      {won && !user && !authLoading && (
        <LoginReminderPopup
          isVisible={showLoginPopup}
          onSignUp={() => {
            setShowLoginPopup(false);
            setShowAuthModal(true);
          }}
          onDismiss={() => setShowLoginPopup(false)}
          gameType="tandem"
        />
      )}

      <div className="animate-fade-in -mt-16">
        {/* Main completion card */}
        <div
          className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center relative ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Back arrow button at top left */}
          <button
            onClick={() => {
              lightTap();
              onReturnToWelcome();
            }}
            className="absolute left-4 top-4 w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-[100]"
            title="Back to Home"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div>
            {/* Logo - Only show on tablet/desktop (not mobile phones) */}
            {!isMobilePhone && (
              <button
                onClick={() => {
                  lightTap();
                  onReturnToWelcome();
                }}
                className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                title="Return to Welcome Screen"
              >
                <Image
                  src={`${theme === 'dark' ? '/icons/ui/tandem-dark.png' : '/icons/ui/tandem.png'}?v=${ASSET_VERSION}`}
                  alt="Tandem Logo"
                  width={96}
                  height={96}
                  className="rounded-2xl"
                />
              </button>
            )}

            <h1
              className={`font-bold mb-2 text-gray-800 dark:text-gray-200 ${won ? 'text-4xl' : 'text-3xl'}`}
            >
              {won ? (
                <span className="inline-block animate-success-bounce">{congratsMessage}</span>
              ) : hardModeTimeUp ? (
                <span className="whitespace-nowrap text-red-600 dark:text-red-400">
                  Time's Up! ⏰
                </span>
              ) : (
                <span className="whitespace-nowrap">Better luck next time</span>
              )}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {won
                ? isHardMode
                  ? 'You conquered Hard Mode! 🔥'
                  : "You solved today's puzzle!"
                : hardModeTimeUp
                  ? "3 minutes wasn't enough this time!"
                  : "You'll get it tomorrow!"}
            </p>

            {puzzleTheme && (
              <div
                className={`rounded-2xl p-5 mb-6 relative overflow-hidden border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : won
                      ? 'bg-accent-yellow/20 dark:bg-yellow-900/40 border-black dark:border-gray-600'
                      : 'bg-gray-100 dark:bg-gray-800 border-black dark:border-gray-600'
                }`}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
                  {won ? "You discovered today's theme:" : 'The theme was:'}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {puzzleTheme}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div
                className={`rounded-2xl p-4 text-center border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] animate-scale-fade-in stagger-1 ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : isHardMode
                      ? 'bg-accent-red/20 dark:bg-red-900/50 border-black dark:border-gray-600'
                      : 'bg-accent-blue/20 dark:bg-sky-900/50 border-black dark:border-gray-600'
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {formatTime(time)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Time</div>
              </div>
              <div
                className={`rounded-2xl p-4 text-center border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] animate-scale-fade-in stagger-2 ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-orange/20 dark:bg-orange-900/50 border-black dark:border-gray-600'
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {mistakes}/4
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mistakes</div>
              </div>
              <div
                className={`rounded-2xl p-4 text-center border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center animate-scale-fade-in stagger-3 ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-accent-pink/20 dark:bg-pink-900/50 border-black dark:border-gray-600'
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {formatDateShort(puzzleDate)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Date</div>
              </div>
            </div>

            {(hintsUsed > 0 || difficultyRating) && (
              <div
                className={`flex items-center text-sm text-gray-600 dark:text-gray-400 mb-6 ${hintsUsed > 0 ? 'justify-between' : 'justify-end'}`}
              >
                {hintsUsed > 0 && (
                  <div>
                    💡 {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used
                  </div>
                )}
                {difficultyRating && (
                  <div className="flex items-center gap-1.5">
                    <span>Difficulty: {difficultyRating}</span>
                    <button
                      onClick={() => {
                        lightTap();
                        setShowHowToPlay(true);
                      }}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      aria-label="Learn about difficulty ratings"
                    >
                      ⓘ
                    </button>
                  </div>
                )}
              </div>
            )}

            {!won && puzzle?.puzzles && (
              <button
                onClick={() => {
                  lightTap();
                  setShowRevealAnswers(true);
                }}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all mb-6 border-[3px] ${
                  highContrast
                    ? 'bg-hc-primary border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-accent-orange text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Image src="/icons/ui/open-book.png" alt="" width={20} height={20} />
                  Reveal Correct Answers
                </span>
              </button>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {won && (
              <div className="animate-fade-in-up delay-200">
                <ShareButton shareText={shareText} />
              </div>
            )}

            {/* Leaderboard Button - Blue */}
            <button
              onClick={() => {
                lightTap();
                setShowLeaderboard(true);
              }}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] animate-fade-in-up delay-300 ${
                highContrast
                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              Leaderboard
            </button>

            {/* Play from Archive Button - Blue if subscribed, White with lock if not */}
            <button
              onClick={() => {
                lightTap();
                setShowArchive(true);
              }}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] animate-fade-in-up delay-400 ${
                highContrast
                  ? hasSubscription
                    ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                  : hasSubscription
                    ? 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                    : 'bg-ghost-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {!hasSubscription && (
                  <Image
                    src="/icons/ui/lock.png"
                    alt="Locked"
                    width={20}
                    height={20}
                    className="opacity-80"
                  />
                )}
                <span>Play from Archive</span>
              </div>
            </button>

            {/* Account CTA for non-logged-in users */}
            {!user && !authLoading && (
              <div className="mt-6 pt-6 border-t-[2px] border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Your progress will be lost! Create a free account to join the leaderboard, track
                  your stats, and sync across devices!
                </p>
                <button
                  onClick={() => {
                    lightTap();
                    setShowAuthModal(true);
                  }}
                  className={`px-6 py-2.5 rounded-2xl font-bold text-sm transition-all border-[3px] ${
                    highContrast
                      ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                      : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  Create Free Account
                </button>
              </div>
            )}

            {/* Discord Link */}
            <a
              href="https://discord.com/invite/uSxtYQXtHN"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full mt-8 p-4 flex items-center gap-3 rounded-xl transition-colors cursor-pointer text-left ${
                highContrast
                  ? 'bg-hc-surface border-[3px] border-hc-border hover:bg-hc-focus'
                  : 'bg-gray-50 dark:bg-gray-800 border-[3px] border-gray-300 dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)] hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {/* Discord Logo */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-[#5865F2] flex-shrink-0"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
              </svg>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-[#5865F2]">Join us on Discord</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-accent-blue text-white rounded">
                    New
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Connect with other players, share strategies, and report bugs
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <UnifiedStatsModal isOpen={showPlayerStats} onClose={() => setShowPlayerStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(puzzleNumber) => {
          setShowArchive(false);
          // Small delay to ensure modal closes before loading new puzzle
          setTimeout(() => {
            onSelectPuzzle(puzzleNumber);
          }, 100);
        }}
        defaultTab="tandem"
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <RevealAnswersModal
        isOpen={showRevealAnswers}
        onClose={() => setShowRevealAnswers(false)}
        puzzle={puzzle}
      />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="tandem"
        initialTab="daily"
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onSuccess={() => {
          setShowAuthModal(false);
        }}
      />
    </GlobalNavigation>
  );
}
