'use client';
import { useState, useEffect, useRef } from 'react';
import { formatTime, formatDateShort } from '@/lib/utils';
import { playHintSound, playCorrectSound, playErrorSound } from '@/lib/sounds';
import PuzzleRow from './PuzzleRow';
import HintDisplay from './HintDisplay';
import StatsBar from './StatsBar';
import RulesModal from './RulesModal';
import HowToPlayModal from './HowToPlayModal';
import StatsModal from './StatsModal';
import ArchiveModalPaginated from './ArchiveModalPaginated';
import Settings from '@/components/Settings';
import OnScreenKeyboard from './OnScreenKeyboard';
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
  onCheckAnswers: _onCheckAnswers,
  onCheckSingleAnswer,
  _theme,
  _isAuto,
  _currentState,
  onSelectPuzzle,
  hintsUsed,
  hintedAnswers,
  unlockedHints,
  activeHintIndex,
  onUseHint,
  _hasCheckedAnswers,
  onReturnToWelcome,
  isMobilePhone = false,
  isSmallPhone = false,
  isHardMode = false,
  hardModeTimeLimit = 120,
}) {
  // const hasAnyInput = answers.some((answer) => answer.trim() !== '');
  const [showRules, setShowRules] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [keyboardLayout, setKeyboardLayout] = useState('QWERTY');
  const { lightTap, correctAnswer, incorrectAnswer, hintUsed } = useHaptics();
  const { highContrast } = useTheme();
  const contentRef = useRef(null);
  const puzzleContainerRef = useRef(null);

  // Load keyboard layout and listen for changes
  useEffect(() => {
    const loadLayout = () => {
      const saved = localStorage.getItem('keyboardLayout');
      if (saved) {
        setKeyboardLayout(saved);
      }
    };

    const handleLayoutChange = (event) => {
      setKeyboardLayout(event.detail);
    };

    loadLayout();
    window.addEventListener('keyboardLayoutChanged', handleLayoutChange);

    return () => {
      window.removeEventListener('keyboardLayoutChanged', handleLayoutChange);
    };
  }, []);

  // Focus first empty input on mount only
  useEffect(() => {
    const firstEmptyIndex = answers.findIndex(
      (answer, idx) => !correctAnswers[idx] && !answer.trim()
    );
    if (firstEmptyIndex !== -1) {
      setFocusedIndex(firstEmptyIndex);
    }
    // Only run on mount and when puzzle changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  // Hardware keyboard support for desktop
  useEffect(() => {
    if (platformService.isPlatformNative()) return;

    const handleKeyDown = (e) => {
      // Ignore if any modal is open or game is complete
      if (showRules || showHowToPlay || showStats || showArchive || showSettings || solved === 4)
        return;

      // Ignore if typing in another input field (but not our readonly game inputs)
      const isOurInput = e.target.getAttribute('aria-label')?.startsWith('Answer');
      if (!isOurInput && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      // Handle Enter, Backspace, and letter keys
      if (e.key === 'Enter') {
        e.preventDefault();

        // Check the current answer at focused index
        if (answers[focusedIndex].trim()) {
          const result = onCheckSingleAnswer(focusedIndex);

          // Play sounds and haptics
          if (!result.gameComplete) {
            try {
              if (result.isCorrect) {
                playCorrectSound();
                correctAnswer();
              } else {
                playErrorSound();
                incorrectAnswer();
              }
            } catch (err) {
              // Sound might fail
            }
          }

          // Move to next field if correct
          if (result.isCorrect && !result.gameComplete) {
            setTimeout(() => {
              const nextEmptyIndex = answers.findIndex(
                (answer, idx) => idx > focusedIndex && !correctAnswers[idx]
              );
              if (nextEmptyIndex !== -1) {
                setFocusedIndex(nextEmptyIndex);
              }
            }, 300);
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();

        // Skip if this field is already correct
        if (correctAnswers[focusedIndex]) {
          return;
        }

        const currentValue = answers[focusedIndex];
        if (currentValue && currentValue.length > 0) {
          onUpdateAnswer(focusedIndex, currentValue.slice(0, -1));
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();

        // Skip if this field is already correct
        if (correctAnswers[focusedIndex]) {
          return;
        }

        const currentValue = answers[focusedIndex] || '';

        const answerLength = puzzle?.puzzles[focusedIndex]?.answer
          ? puzzle.puzzles[focusedIndex].answer.includes(',')
            ? puzzle.puzzles[focusedIndex].answer.split(',')[0].trim().length
            : puzzle.puzzles[focusedIndex].answer.length
          : 15;

        // Just check against answer length
        if (currentValue.length < answerLength) {
          onUpdateAnswer(focusedIndex, currentValue + e.key.toUpperCase());
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    focusedIndex,
    answers,
    correctAnswers,
    showRules,
    showHowToPlay,
    showStats,
    showArchive,
    showSettings,
    solved,
    puzzle,
    onUpdateAnswer,
    onCheckSingleAnswer,
    correctAnswer,
    incorrectAnswer,
  ]);

  const handleKeyboardInput = (key) => {
    // Ignore if the field is already correct
    if (correctAnswers[focusedIndex]) {
      return;
    }
    // Handle ENTER key
    if (key === 'ENTER') {
      // Check the current answer
      if (onCheckSingleAnswer && answers[focusedIndex].trim()) {
        const result = onCheckSingleAnswer(focusedIndex);

        // Only play individual answer sounds if the game isn't complete
        if (!result.gameComplete) {
          try {
            if (result.isCorrect) {
              playCorrectSound();
              correctAnswer();
            } else {
              playErrorSound();
              incorrectAnswer();
            }
          } catch (e) {
            // Sound might fail on some browsers
          }
        }

        // Move to next field if correct and game isn't complete
        if (result.isCorrect && !result.gameComplete) {
          setTimeout(() => {
            const nextEmptyIndex = answers.findIndex(
              (answer, idx) => idx > focusedIndex && !correctAnswers[idx]
            );
            if (nextEmptyIndex !== -1) {
              setFocusedIndex(nextEmptyIndex);
            }
          }, 300);
        }
      }
      return;
    }

    // Handle BACKSPACE key
    if (key === 'BACKSPACE') {
      // Skip if this field is already correct
      if (correctAnswers[focusedIndex]) {
        return;
      }

      const currentValue = answers[focusedIndex];
      if (currentValue.length > 0) {
        onUpdateAnswer(focusedIndex, currentValue.slice(0, -1));
      }
      return;
    }

    // Handle letter keys
    if (key.length === 1 && /^[A-Z]$/i.test(key)) {
      // Skip if this field is already correct
      if (correctAnswers[focusedIndex]) {
        return;
      }

      const currentValue = answers[focusedIndex] || '';

      const answerLength = puzzle?.puzzles[focusedIndex]?.answer
        ? puzzle.puzzles[focusedIndex].answer.includes(',')
          ? puzzle.puzzles[focusedIndex].answer.split(',')[0].trim().length
          : puzzle.puzzles[focusedIndex].answer.length
        : 15;

      // Just check against answer length
      if (currentValue.length < answerLength) {
        onUpdateAnswer(focusedIndex, currentValue + key);
      }
    }
  };

  const handleUseHint = () => {
    // Use hint for the currently focused answer
    if (focusedIndex !== null && !correctAnswers[focusedIndex]) {
      const success = onUseHint(focusedIndex);
      if (success) {
        try {
          playHintSound();
          hintUsed(); // Haptic feedback for hint usage
        } catch (e) {
          // Sound might fail on some browsers
        }
      }
    } else {
      // If no answer is focused, use hint for first unsolved
      const firstUnsolved = correctAnswers.findIndex((correct) => !correct);
      if (firstUnsolved !== -1) {
        const success = onUseHint(firstUnsolved);
        if (success) {
          try {
            playHintSound();
            hintUsed(); // Haptic feedback for hint usage
          } catch (e) {
            // Sound might fail on some browsers
          }
          setFocusedIndex(firstUnsolved);
        }
      }
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Control buttons */}
      <div className="flex justify-end gap-2 mb-2 sm:mb-3 px-4 sm:px-0">
        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
          }}
          className="w-10 h-10 text-lg rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-all"
          title="Statistics"
        >
          📊
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowArchive(true);
          }}
          className="w-10 h-10 text-lg rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-all"
          title="Archive"
        >
          📅
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowHowToPlay(true);
          }}
          className="w-10 h-10 text-lg rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-all"
          title="How to Play"
        >
          ❓
        </button>
        <button
          onClick={() => {
            lightTap();
            setShowSettings(true);
          }}
          className="w-10 h-10 text-lg rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-all"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Main game card */}
      <div
        ref={puzzleContainerRef}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header - logo hidden on all devices, content centered */}
        <div className="pt-4 pb-2 px-3 sm:px-5 text-center bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium flex items-center justify-center gap-2 relative w-full">
            <button
              onClick={() => {
                lightTap();
                onReturnToWelcome();
              }}
              className="absolute left-0 w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
            <div className="flex flex-col items-center">
              <span>Daily Puzzle {puzzle?.date ? formatDateShort(puzzle.date) : ''}</span>
              {isHardMode && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span className="text-sm">🔥</span>
                    HARD MODE
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6" ref={contentRef}>
          <div className="max-w-lg mx-auto">
            <StatsBar
              time={formatTime(time)}
              mistakes={mistakes}
              solved={solved}
              isSmallPhone={isSmallPhone}
              isMobilePhone={isMobilePhone}
              isHardMode={isHardMode}
              hardModeTimeLimit={hardModeTimeLimit}
            />

            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 mt-3 sm:mt-4">
              {puzzle &&
                puzzle.puzzles &&
                puzzle.puzzles.map((p, index) => (
                  <div key={index} className="relative">
                    <PuzzleRow
                      emoji={p.emoji || '❓❓'}
                      value={answers[index]}
                      onChange={(value) => onUpdateAnswer(index, value)}
                      isCorrect={correctAnswers[index]}
                      isWrong={checkedWrongAnswers && checkedWrongAnswers[index]}
                      index={index}
                      onFocus={() => setFocusedIndex(index)}
                      isFocused={focusedIndex === index}
                      readonly={true}
                      hasHint={hintedAnswers.includes(index)}
                      answerLength={
                        p.answer
                          ? p.answer.includes(',')
                            ? p.answer.split(',')[0].trim().length
                            : p.answer.length
                          : 0
                      }
                      isSmallPhone={isSmallPhone}
                      isMobilePhone={isMobilePhone}
                    />
                    {/* Show hint below this answer if it's the active hint */}
                    <HintDisplay
                      hint={p.hint}
                      isVisible={activeHintIndex === index && !correctAnswers[index]}
                      answerIndex={index}
                      isSmallPhone={isSmallPhone}
                      isMobilePhone={isMobilePhone}
                    />
                  </div>
                ))}
            </div>

            {/* Hint button - positioned before keyboard (not shown in hard mode) */}
            {!isHardMode && hintsUsed < unlockedHints && solved < 4 && (
              <div className="mb-3">
                <button
                  onClick={() => {
                    lightTap();
                    handleUseHint();
                  }}
                  className={`w-full p-2.5 sm:p-3 text-sm sm:text-base rounded-xl font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 hint-button ${
                    highContrast
                      ? 'bg-hc-warning text-white border-4 border-hc-border hover:bg-hc-focus hover:shadow-lg'
                      : 'bg-yellow-400 hover:bg-yellow-500 dark:bg-amber-600 dark:hover:bg-amber-700 text-gray-800 dark:text-gray-100 border-none'
                  }`}
                  disabled={focusedIndex === null || correctAnswers[focusedIndex]}
                  aria-label={`Use hint. ${unlockedHints - hintsUsed} of ${unlockedHints} hints available`}
                >
                  <span className="text-lg sm:text-xl">💡</span>
                  {unlockedHints > 1
                    ? `Use Hint (${unlockedHints - hintsUsed} of ${unlockedHints})`
                    : `Use Hint (${unlockedHints - hintsUsed} available)`}
                </button>
                {unlockedHints === 1 && solved >= 1 && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                    Get 1 more correct answer to unlock another hint!
                  </p>
                )}
              </div>
            )}

            {/* On-screen keyboard */}
            <OnScreenKeyboard
              onKeyPress={handleKeyboardInput}
              disabled={solved === 4}
              layout={keyboardLayout}
              isSmallPhone={isSmallPhone}
              isMobilePhone={isMobilePhone}
            />
          </div>
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModalPaginated
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={onSelectPuzzle}
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
