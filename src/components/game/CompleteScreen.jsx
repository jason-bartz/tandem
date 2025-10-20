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
import StatsModal from './StatsModal';
import ArchiveModalPaginated from './ArchiveModalPaginated';
import HowToPlayModal from './HowToPlayModal';
import RevealAnswersModal from './RevealAnswersModal';
import ShareButton from './ShareButton';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useDeviceType } from '@/lib/deviceDetection';
import Settings from '@/components/Settings';

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
  const [showStats, setShowStats] = useState(false);
  const [showPlayerStats, setShowPlayerStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRevealAnswers, setShowRevealAnswers] = useState(false);
  const [congratsMessage, setCongratsMessage] = useState('');
  const { celebration, lightTap } = useHaptics();
  const { highContrast, reduceMotion } = useTheme();
  const { isMobilePhone } = useDeviceType();

  // Get the actual puzzle date (from the puzzle object for archive games, or current for today's)
  const puzzleDate = puzzle?.date || getCurrentPuzzleInfo().isoDate;

  // Generate share text - map hint positions correctly
  // hintedAnswers is an array of puzzle indices that received hints (e.g., [0, 2])
  // We pass this directly to generateShareText which expects an array of indices
  const hintPositions = hintedAnswers || [];

  // Debug logging
  console.log('[CompleteScreen] Props received:', {
    hintsUsed,
    hintedAnswers,
    won,
    correctAnswers,
    isHardMode,
  });

  console.log('[CompleteScreen] Share text generation:', {
    puzzleDate,
    time,
    mistakes,
    hintsUsed,
    hintPositions,
    solved: won ? 4 : correctAnswers || 0,
    isHardMode,
    hardModeTimeUp,
  });

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

  console.log('[CompleteScreen] Generated share text:', shareText);

  useEffect(() => {
    if (won) {
      // Set random congratulatory message
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
    // Only run once when component mounts with won=true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  return (
    <div className="animate-fade-in">
      {/* Control buttons positioned above the card - Dynamic Island aware */}
      <div className="flex justify-end gap-2 mb-4 pt-safe-ios px-4 sm:px-0">
        <button
          onClick={() => {
            lightTap();
            setShowPlayerStats(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform duration-instant"
          title="Statistics"
        >
          📊
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform duration-instant"
          title="Archive"
        >
          📅
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform duration-instant"
          title="How to Play"
        >
          ❓
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 active:scale-95 transition-transform duration-instant"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Main completion card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-10 text-center relative">
        {/* Back arrow button at top left */}
        <button
          onClick={() => {
            lightTap();
            onReturnToWelcome();
          }}
          className="absolute left-4 top-4 w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                src={theme === 'dark' ? '/images/dark-mode-logo-2.webp' : '/images/main-logo.webp'}
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
              className={`rounded-2xl p-5 mb-6 relative overflow-hidden ${
                highContrast
                  ? 'bg-hc-surface'
                  : won
                    ? 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 dark:from-yellow-900/40 dark:via-amber-900/40 dark:to-orange-900/40'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
              }`}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
                {won ? "You discovered today's theme:" : 'The theme was:'}
              </p>
              <p
                className={`text-2xl font-bold ${
                  highContrast
                    ? 'text-hc-text'
                    : won
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {puzzleTheme}
              </p>
              {difficultyRating && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Difficulty: {difficultyRating}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className={`rounded-xl p-4 text-center animate-scale-fade-in stagger-1 ${
                isHardMode
                  ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-700'
                  : 'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  isHardMode ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {formatTime(time)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Time</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center animate-scale-fade-in stagger-2">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{mistakes}/4</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mistakes</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center flex flex-col items-center justify-center animate-scale-fade-in stagger-3">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {formatDateShort(puzzleDate)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Date</div>
            </div>
          </div>

          {hintsUsed > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              💡 {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used
            </div>
          )}

          {!won && puzzle?.puzzles && (
            <button
              onClick={() => {
                lightTap();
                setShowRevealAnswers(true);
              }}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg mb-6 ${
                highContrast
                  ? 'bg-hc-primary border-2 border-hc-border hover:bg-hc-focus'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
              }`}
            >
              📖 Reveal Correct Answers
            </button>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {won && <ShareButton shareText={shareText} />}
          <button
            onClick={() => {
              lightTap();
              setShowArchive(true);
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Play from Archive
          </button>
        </div>

        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
          }}
          className="text-sky-600 dark:text-sky-400 hover:underline text-sm"
        >
          View All Statistics
        </button>
      </div>

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}

      <StatsModal isOpen={showPlayerStats} onClose={() => setShowPlayerStats(false)} />
      <ArchiveModalPaginated
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          // Small delay to ensure modal closes before loading new puzzle
          setTimeout(() => {
            onSelectPuzzle(date);
          }, 100);
        }}
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <RevealAnswersModal
        isOpen={showRevealAnswers}
        onClose={() => setShowRevealAnswers(false)}
        puzzle={puzzle}
      />
    </div>
  );
}
