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
import { useUIIcon } from '@/hooks/useUIIcon';
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
  const getIconPath = useUIIcon();
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
          className={`w-10 h-10 rounded-2xl border-[3px] flex items-center justify-center transition-all ${
            highContrast
              ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[2px_2px_0px_rgba(0,0,0,0.3)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
          }`}
          title="Statistics"
        >
          <img src={getIconPath('stats')} alt="Statistics" className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          className={`w-10 h-10 rounded-2xl border-[3px] flex items-center justify-center transition-all ${
            highContrast
              ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[2px_2px_0px_rgba(0,0,0,0.3)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
          }`}
          title="Archive"
        >
          <img src={getIconPath('archive')} alt="Archive" className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className={`w-10 h-10 rounded-2xl border-[3px] flex items-center justify-center transition-all ${
            highContrast
              ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[2px_2px_0px_rgba(0,0,0,0.3)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
          }`}
          title="How to Play"
        >
          <img src={getIconPath('how-to-play')} alt="How to Play" className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className={`w-10 h-10 rounded-2xl border-[3px] flex items-center justify-center transition-all ${
            highContrast
              ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[2px_2px_0px_rgba(0,0,0,0.3)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
          }`}
          title="Settings"
        >
          <img src={getIconPath('settings')} alt="Settings" className="w-5 h-5" />
        </button>
      </div>

      {/* Main completion card */}
      <div
        className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center relative ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
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
              className={`rounded-2xl p-5 mb-6 relative overflow-hidden border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : won
                    ? 'bg-accent-yellow/20 dark:bg-yellow-900/40 border-accent-yellow'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
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
                      ? 'text-accent-yellow dark:text-accent-yellow'
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
              className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] animate-scale-fade-in stagger-1 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : isHardMode
                    ? 'bg-accent-red/20 dark:bg-red-900/40 border-accent-red'
                    : 'bg-accent-blue/20 dark:bg-sky-900/40 border-accent-blue'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  highContrast
                    ? 'text-hc-text'
                    : isHardMode
                      ? 'text-accent-red dark:text-accent-red'
                      : 'text-accent-blue dark:text-accent-blue'
                }`}
              >
                {formatTime(time)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Time</div>
            </div>
            <div
              className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] animate-scale-fade-in stagger-2 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-accent-orange/20 dark:bg-orange-900/40 border-accent-orange'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  highContrast ? 'text-hc-text' : 'text-accent-orange dark:text-accent-orange'
                }`}
              >
                {mistakes}/4
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Mistakes</div>
            </div>
            <div
              className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center animate-scale-fade-in stagger-3 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-accent-pink/20 dark:bg-pink-900/40 border-accent-pink'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  highContrast ? 'text-hc-text' : 'text-accent-pink dark:text-accent-pink'
                }`}
              >
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
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all mb-6 border-[3px] ${
                highContrast
                  ? 'bg-hc-primary border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-orange text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
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
            className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            Play from Archive
          </button>
        </div>

        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
          }}
          className={`text-sm font-medium ${
            highContrast
              ? 'text-hc-primary hover:text-hc-focus'
              : 'text-accent-blue dark:text-accent-blue hover:underline'
          }`}
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
