'use client';
import { useState, useEffect, useRef } from 'react';
import { formatTime, formatDateShort } from '@/lib/utils';
import { playHintSound, playCorrectSound, playErrorSound } from '@/lib/sounds';
import PuzzleRow from './PuzzleRow';
import HintDisplay from './HintDisplay';
import HintEarnedToast from './HintEarnedToast';
import StatsBar from './StatsBar';
import RulesModal from './RulesModal';
import HowToPlayModal from './HowToPlayModal';
import StatsModal from './StatsModal';
import ArchiveCalendar from './ArchiveCalendar';
import Settings from '@/components/Settings';
import OnScreenKeyboard from './OnScreenKeyboard';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import platformService from '@/services/platform';
import { motion } from 'framer-motion';

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
  lockedLetters = [null, null, null, null],
  onUseHint,
  _hasCheckedAnswers,
  onReturnToWelcome,
  game,
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
  const [showSecondHintCelebration, setShowSecondHintCelebration] = useState(false);
  const [previousUnlockedHints, setPreviousUnlockedHints] = useState(unlockedHints);
  const { lightTap, correctAnswer, incorrectAnswer, hintUsed } = useHaptics();
  const { highContrast, reduceMotion } = useTheme();
  const getIconPath = useUIIcon();
  const contentRef = useRef(null);
  const puzzleContainerRef = useRef(null);

  // Detect when second hint is unlocked and trigger celebration
  useEffect(() => {
    // Check if we just unlocked the second hint (transition from 1 to 2)
    if (previousUnlockedHints === 1 && unlockedHints === 2 && hintsUsed < 2) {
      // Trigger celebration animation
      setShowSecondHintCelebration(true);

      // Play haptic feedback for celebration
      correctAnswer(); // Use success haptic for celebration

      // Reset celebration after 2.5 seconds (align with toast duration)
      const timer = setTimeout(() => {
        setShowSecondHintCelebration(false);
      }, 2500);

      return () => clearTimeout(timer);
    }

    // Update previous value
    setPreviousUnlockedHints(unlockedHints);
  }, [unlockedHints, previousUnlockedHints, hintsUsed, correctAnswer]);

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

        // Use helper that handles locked letters
        if (game.handleBackspace) {
          game.handleBackspace(focusedIndex);
        } else {
          // Fallback to simple behavior
          const currentValue = answers[focusedIndex];
          if (currentValue && currentValue.length > 0) {
            onUpdateAnswer(focusedIndex, currentValue.slice(0, -1));
          }
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();

        // Skip if this field is already correct
        if (correctAnswers[focusedIndex]) {
          return;
        }

        const answerLength = puzzle?.puzzles[focusedIndex]?.answer
          ? puzzle.puzzles[focusedIndex].answer.includes(',')
            ? puzzle.puzzles[focusedIndex].answer.split(',')[0].trim().length
            : puzzle.puzzles[focusedIndex].answer.length
          : 15;

        // Use helper that handles locked letters
        if (game.handleLetterInput) {
          game.handleLetterInput(focusedIndex, e.key.toUpperCase(), answerLength);
        } else {
          // Fallback to simple behavior
          const currentValue = answers[focusedIndex] || '';
          if (currentValue.length < answerLength) {
            onUpdateAnswer(focusedIndex, currentValue + e.key.toUpperCase());
          }
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
    game,
  ]);

  const handleKeyboardInput = (key) => {
    // Handle ARROW_UP - move to previous answer
    if (key === 'ARROW_UP') {
      if (focusedIndex > 0) {
        // Find previous non-correct answer
        let prevIndex = focusedIndex - 1;
        while (prevIndex >= 0 && correctAnswers[prevIndex]) {
          prevIndex--;
        }
        if (prevIndex >= 0) {
          setFocusedIndex(prevIndex);
        }
      }
      return;
    }

    // Handle ARROW_DOWN - move to next answer
    if (key === 'ARROW_DOWN') {
      if (focusedIndex < 3) {
        // Find next non-correct answer
        let nextIndex = focusedIndex + 1;
        while (nextIndex < 4 && correctAnswers[nextIndex]) {
          nextIndex++;
        }
        if (nextIndex < 4) {
          setFocusedIndex(nextIndex);
        }
      }
      return;
    }

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

      // Use helper that handles locked letters
      if (game.handleBackspace) {
        game.handleBackspace(focusedIndex);
      } else {
        // Fallback to simple behavior
        const currentValue = answers[focusedIndex];
        if (currentValue.length > 0) {
          onUpdateAnswer(focusedIndex, currentValue.slice(0, -1));
        }
      }
      return;
    }

    // Handle letter keys
    if (key.length === 1 && /^[A-Z]$/i.test(key)) {
      // Skip if this field is already correct
      if (correctAnswers[focusedIndex]) {
        return;
      }

      const answerLength = puzzle?.puzzles[focusedIndex]?.answer
        ? puzzle.puzzles[focusedIndex].answer.includes(',')
          ? puzzle.puzzles[focusedIndex].answer.split(',')[0].trim().length
          : puzzle.puzzles[focusedIndex].answer.length
        : 15;

      // Use helper that handles locked letters
      if (game.handleLetterInput) {
        game.handleLetterInput(focusedIndex, key, answerLength);
      } else {
        // Fallback to simple behavior
        const currentValue = answers[focusedIndex] || '';
        if (currentValue.length < answerLength) {
          onUpdateAnswer(focusedIndex, currentValue + key);
        }
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
      {/* Hint Earned Toast */}
      <HintEarnedToast isSmallPhone={isSmallPhone} isMobilePhone={isMobilePhone} />

      {/* Control buttons */}
      <div className="flex justify-end gap-2 mb-2 sm:mb-3 px-4 sm:px-0">
        <button
          onClick={() => {
            lightTap();
            setShowStats(true);
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

      {/* Main game card */}
      <div
        ref={puzzleContainerRef}
        className={`rounded-[32px] border-[3px] overflow-hidden ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header - logo hidden on all devices, content centered */}
        <div
          className={`pt-4 pb-2 px-3 sm:px-5 text-center flex items-center justify-center ${
            highContrast ? 'bg-hc-surface' : 'bg-white dark:bg-bg-card'
          }`}
        >
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
                    <img src={getIconPath('hardmode')} alt="Hard Mode" className="w-4 h-4" />
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
                      onChange={(answerIndex, value) => onUpdateAnswer(answerIndex, value)}
                      isCorrect={correctAnswers[index]}
                      isWrong={checkedWrongAnswers && checkedWrongAnswers[index]}
                      index={index}
                      onFocus={() => setFocusedIndex(index)}
                      isFocused={focusedIndex === index}
                      readonly={true}
                      hasHint={hintedAnswers.includes(index)}
                      lockedLetters={lockedLetters[index]}
                      answerLength={
                        p.answer
                          ? p.answer.includes(',')
                            ? p.answer.split(',')[0].trim().length
                            : p.answer.length
                          : 0
                      }
                      onKeyboardInput={handleKeyboardInput}
                      themeColor={puzzle?.themeColor || '#3B82F6'}
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
                <motion.button
                  onClick={() => {
                    lightTap();
                    handleUseHint();
                  }}
                  className={`w-full ${
                    isSmallPhone ? 'p-2.5' : isMobilePhone ? 'p-3' : 'p-3 sm:p-4'
                  } text-sm sm:text-base rounded-2xl font-bold cursor-pointer transition-all flex items-center justify-center gap-2 relative overflow-hidden border-[3px] ${
                    highContrast
                      ? 'bg-hc-warning text-hc-primary-text border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      : 'bg-accent-yellow text-dark-text dark:text-gray-900 border-border-main shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={focusedIndex === null || correctAnswers[focusedIndex]}
                  aria-label={`Use hint. ${unlockedHints - hintsUsed} of ${unlockedHints} hints available`}
                  // Celebratory animation when second hint appears
                  animate={
                    showSecondHintCelebration && !reduceMotion
                      ? {
                          scale: [1, 1.05, 0.98, 1.02, 1],
                          rotate: [0, -2, 2, -1, 0],
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.6,
                    ease: [0.34, 1.56, 0.64, 1], // iOS spring curve
                  }}
                >
                  {/* Sparkle effect overlay during celebration */}
                  {showSecondHintCelebration && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.6, times: [0, 0.5, 1] }}
                    >
                      <span className="text-3xl">✨</span>
                    </motion.div>
                  )}

                  {/* Button text - changes during celebration */}
                  <motion.span
                    key={showSecondHintCelebration ? 'celebration' : 'normal'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {showSecondHintCelebration ? "You've earned a second hint!" : 'Use Hint'}
                  </motion.span>

                  {/* Extra sparkle for celebration */}
                  {showSecondHintCelebration && (
                    <motion.span
                      className="text-lg sm:text-xl"
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0, rotate: 180 }}
                      transition={{ duration: 0.5, ease: 'backOut' }}
                    >
                      🎉
                    </motion.span>
                  )}
                </motion.button>
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
      <ArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={onSelectPuzzle}
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
