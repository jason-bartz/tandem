'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { formatTime, formatDateShort } from '@/lib/utils';
import { playHintSound, playCorrectSound, playErrorSound } from '@/lib/sounds';
import PuzzleRow from './PuzzleRow';
import StatsBar from './StatsBar';
import RulesModal from './RulesModal';
import HowToPlayModal from './HowToPlayModal';
import StatsModal from './StatsModal';
import ArchiveModal from './ArchiveModal';
import Settings from '@/components/Settings';
import { useArchivePreload } from '@/hooks/useArchivePreload';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import platformService from '@/services/platform';

export default function PlayingScreen({
  puzzle,
  answers,
  correctAnswers,
  checkedWrongAnswers,
  mistakes,
  solved,
  time,
  onUpdateAnswer,
  onCheckAnswers,
  onCheckSingleAnswer,
  theme,
  _isAuto,
  _currentState,
  onSelectPuzzle,
  hintsUsed,
  onUseHint,
  _hasCheckedAnswers,
  onReturnToWelcome,
  activeHints,
}) {
  const hasAnyInput = answers.some((answer) => answer.trim() !== '');
  const [showRules, setShowRules] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { preloadArchive } = useArchivePreload();
  const { lightTap, correctAnswer, incorrectAnswer, hintUsed } = useHaptics();
  const { highContrast } = useTheme();
  const contentRef = useRef(null);
  const puzzleContainerRef = useRef(null);

  // Handle iOS keyboard visibility and scrolling
  useEffect(() => {
    if (!platformService.isPlatformNative()) {
      return;
    }

    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT') {
        setIsKeyboardVisible(true);
        // Scroll the input into view with some padding
        setTimeout(() => {
          const inputRect = e.target.getBoundingClientRect();
          const container = puzzleContainerRef.current;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop;
            const inputTop = inputRect.top - containerRect.top + scrollTop;
            const desiredPosition = inputTop - 100; // 100px padding from top

            container.scrollTo({
              top: desiredPosition,
              behavior: 'smooth',
            });
          }
        }, 300); // Wait for keyboard animation
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardVisible(false);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const handleEnterPress = (index) => {
    // Check the current answer
    if (onCheckSingleAnswer) {
      const result = onCheckSingleAnswer(index);

      // Only play individual answer sounds if the game isn't complete
      // (game completion sounds are handled in completeGame function)
      if (!result.gameComplete) {
        try {
          if (result.isCorrect) {
            playCorrectSound(); // Simple ding for individual correct answer
            correctAnswer(); // Haptic feedback for correct answer
          } else if (answers[index].trim()) {
            // Only play error sound if there was actually an answer entered
            playErrorSound();
            incorrectAnswer(); // Haptic feedback for wrong answer
          }
        } catch (e) {
          // Sound might fail on some browsers
        }
      }

      // Only move to next field if the answer was correct and game isn't complete
      if (result.isCorrect && !result.gameComplete) {
        setTimeout(() => {
          const inputs = document.querySelectorAll('input[type="text"]:not([disabled])');
          const currentIndex = Array.from(inputs).findIndex(
            (input) => document.activeElement === input
          );
          if (currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          }
        }, 300);
      }
      // If wrong or game complete, cursor stays in the same field
    }
  };

  const handleUseHint = () => {
    // Find all unsolved puzzles and randomly select one for the hint
    const unsolvedIndices = [];
    for (let i = 0; i < 4; i++) {
      if (!correctAnswers[i]) {
        unsolvedIndices.push(i);
      }
    }

    if (unsolvedIndices.length > 0) {
      // Randomly select one of the unsolved puzzles
      const randomIndex = Math.floor(Math.random() * unsolvedIndices.length);
      const hintIndex = unsolvedIndices[randomIndex];

      try {
        playHintSound();
        hintUsed(); // Haptic feedback for hint usage
      } catch (e) {
        // Sound might fail on some browsers
      }
      onUseHint(hintIndex);
    }
  };

  return (
    <div className="animate-slide-up relative h-full flex flex-col">
      {/* Control buttons with safe area padding for iOS */}
      <div className="flex justify-end gap-2 mb-2 sm:mb-4 pt-safe-ios">
        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          onMouseEnter={() => preloadArchive()}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="Archive"
        >
          📅
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="How to Play"
        >
          ❓
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-lg hover:scale-110 transition-all"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Main game card with scroll container */}
      <div
        ref={puzzleContainerRef}
        className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex-1 flex flex-col ${
          platformService.isPlatformNative() ? 'overflow-y-auto scrollable' : ''
        }`}
        style={{
          maxHeight: platformService.isPlatformNative() ? 'calc(100vh - 120px)' : 'auto',
          paddingBottom: isKeyboardVisible ? '280px' : '0',
        }}
      >
        {/* Header with gradient - Logo hidden on mobile */}
        <div
          className={`p-5 text-center flex-shrink-0 ${
            highContrast
              ? 'bg-hc-primary border-b-4 border-hc-border'
              : 'bg-gradient-to-r from-sky-500 to-teal-400 dark:from-gray-900 dark:to-gray-900'
          }`}
        >
          {/* Only show logo on larger screens */}
          <button
            onClick={() => {
              lightTap();
              onReturnToWelcome();
            }}
            className="hidden sm:block w-16 h-16 mx-auto mb-2 relative cursor-pointer hover:scale-110 transition-transform"
            title="Return to Welcome Screen"
          >
            <Image
              src={theme === 'dark' ? '/images/dark-mode-logo-2.webp' : '/images/alt-logo.webp'}
              alt="Tandem Logo"
              width={64}
              height={64}
              className="rounded-xl"
              priority
            />
          </button>
          <div className="text-white/90 text-sm font-medium flex items-center justify-center gap-2 relative">
            <button
              onClick={() => {
                lightTap();
                onReturnToWelcome();
              }}
              className="absolute left-0 w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
              title="Back to Home"
            >
              <svg
                className="w-5 h-5 text-white/90"
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
            <span>Daily Puzzle {puzzle?.date ? formatDateShort(puzzle.date) : ''}</span>
          </div>
        </div>

        <div className="p-6 flex-1" ref={contentRef}>
          <StatsBar time={formatTime(time)} mistakes={mistakes} solved={solved} />

          <div className="flex flex-col gap-4 mb-6 mt-4">
            {puzzle &&
              puzzle.puzzles &&
              puzzle.puzzles.map((p, index) => (
                <PuzzleRow
                  key={index}
                  emoji={p.emoji || '❓❓'}
                  value={answers[index]}
                  onChange={(value) => onUpdateAnswer(index, value)}
                  isCorrect={correctAnswers[index]}
                  isWrong={checkedWrongAnswers && checkedWrongAnswers[index]}
                  index={index}
                  onEnterPress={() => handleEnterPress(index)}
                  hintData={activeHints && activeHints[index]}
                  answerLength={
                    p.answer
                      ? p.answer.includes(',')
                        ? p.answer.split(',')[0].trim().length
                        : p.answer.length
                      : 0
                  }
                />
              ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                if (hasAnyInput) {
                  lightTap();
                  onCheckAnswers();
                }
              }}
              disabled={!hasAnyInput}
              className={`w-full p-4 text-white rounded-xl text-base font-bold cursor-pointer transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none check-button
                ${
                  highContrast
                    ? 'bg-hc-primary border-4 border-hc-border hover:bg-hc-focus hover:shadow-lg'
                    : 'bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500 border-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/30 dark:hover:shadow-sky-400/20'
                }
              `}
            >
              Check Answers
            </button>

            {hintsUsed === 0 && solved < 4 && (
              <button
                onClick={() => {
                  lightTap();
                  handleUseHint();
                }}
                className={`w-full p-3 rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 hint-button
                  ${
                    highContrast
                      ? 'bg-hc-warning text-white border-4 border-hc-border hover:bg-hc-focus hover:shadow-lg'
                      : 'bg-yellow-400 hover:bg-yellow-500 dark:bg-amber-600 dark:hover:bg-amber-700 text-gray-800 dark:text-gray-100 border-none'
                  }
                `}
              >
                <span className="text-xl">💡</span>
                Use Hint (1 available)
              </button>
            )}
          </div>
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModal
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={onSelectPuzzle}
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
