'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CRYPTIC_CONFIG } from '@/lib/constants';
import { formatDateShort } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import HintModal from './HintModal';
import CrypticGuideModal from './CrypticGuideModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';
import OnScreenKeyboard from '@/components/game/OnScreenKeyboard';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';

export default function CrypticGameScreen({
  puzzle,
  userAnswer,
  updateAnswer,
  checkAnswer,
  hintsUsed,
  unlockedHints,
  useHint: onUseHint,
  getAvailableHints: _getAvailableHints,
  canUseHint,
  elapsedTime,
  attempts,
  onBack,
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0); // Overall letter index (across all words)
  const [showGuide, setShowGuide] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [keyboardLayout, setKeyboardLayout] = useState('QWERTY');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { highContrast } = useTheme();
  const scrollContainerRef = useRef(null);
  const activeBlockRef = useRef(null);

  // Parse word pattern from puzzle
  const wordPattern = puzzle.word_pattern || [puzzle.length];
  const isMultiWord = wordPattern.length > 1;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Get the starting index of a word
  const getWordStartIndex = (wordIndex) => {
    return wordPattern.slice(0, wordIndex).reduce((sum, len) => sum + len, 0);
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!userAnswer.trim()) return;

      const correct = await checkAnswer();
      if (!correct) {
        // Show incorrect feedback
        setIsIncorrect(true);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          setIsIncorrect(false);
        }, 2000);
      }
      // If correct, the game state will transition to COMPLETE
    },
    [userAnswer, checkAnswer]
  );

  const handleCharacterClick = (index) => {
    setActiveIndex(index);
  };

  // Initialize scroll position to show beginning of word
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (scrollContainerRef.current && activeIndex === 0) {
        scrollContainerRef.current.scrollLeft = 0;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [puzzle.id, activeIndex]);

  const handleKeyPress = useCallback(
    (key) => {
      if (key === 'ENTER') {
        handleSubmit({ preventDefault: () => {} });
      } else if (key === 'BACKSPACE') {
        const answerArray = userAnswer.padEnd(puzzle.length, ' ').split('');
        if (answerArray[activeIndex] && answerArray[activeIndex] !== ' ') {
          // Delete current character
          answerArray[activeIndex] = ' ';
          updateAnswer(answerArray.join('').trimEnd());
        } else if (activeIndex > 0) {
          // Move back and delete
          const newIndex = activeIndex - 1;
          setActiveIndex(newIndex);
          answerArray[newIndex] = ' ';
          updateAnswer(answerArray.join('').trimEnd());
        }
      } else {
        // Letter key
        const answerArray = userAnswer.padEnd(puzzle.length, ' ').split('');
        answerArray[activeIndex] = key;
        const newAnswer = answerArray.join('').trimEnd();
        updateAnswer(newAnswer);

        // Move to next cell
        if (activeIndex < puzzle.length - 1) {
          const newIndex = activeIndex + 1;
          setActiveIndex(newIndex);
        }
      }
    },
    [handleSubmit, userAnswer, puzzle.length, activeIndex, updateAnswer]
  );

  const handleUnlockHint = useCallback(
    (hintIndex) => {
      if (canUseHint) {
        onUseHint(hintIndex);
        // Don't close the modal automatically - let user review hints
      }
    },
    [canUseHint, onUseHint]
  );

  // Load keyboard layout and handle physical keyboard input
  useEffect(() => {
    // Load keyboard layout from localStorage
    const savedLayout = localStorage.getItem('keyboardLayout');
    if (savedLayout) {
      setKeyboardLayout(savedLayout);
    }

    // Listen for keyboard layout changes
    const handleLayoutChange = (e) => {
      setKeyboardLayout(e.detail);
    };

    window.addEventListener('keyboardLayoutChanged', handleLayoutChange);

    // Handle physical keyboard input (desktop)
    const handlePhysicalKeyboard = (e) => {
      // Ignore if typing in input/textarea (shouldn't happen, but safety check)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Enter key
      if (e.key === 'Enter') {
        e.preventDefault();
        if (userAnswer.trim()) {
          handleSubmit({ preventDefault: () => {} });
        }
        return;
      }

      // Handle Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
        return;
      }

      // Handle Arrow Keys
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeIndex > 0) {
          const newIndex = activeIndex - 1;
          setActiveIndex(newIndex);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeIndex < puzzle.length - 1) {
          const newIndex = activeIndex + 1;
          setActiveIndex(newIndex);
        }
        return;
      }

      // Handle letter keys (A-Z)
      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key.toUpperCase());
      }
    };

    document.addEventListener('keydown', handlePhysicalKeyboard);

    // Prevent mobile keyboard from appearing
    const preventMobileKeyboard = (e) => {
      // Blur any input/textarea elements on touch to prevent keyboard
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.target.blur();
        e.preventDefault();
      }
    };

    // Prevent focus on touch devices
    const preventFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventMobileKeyboard, { passive: false });
    document.addEventListener('focus', preventFocus, true);

    return () => {
      window.removeEventListener('keyboardLayoutChanged', handleLayoutChange);
      document.removeEventListener('keydown', handlePhysicalKeyboard);
      document.removeEventListener('touchstart', preventMobileKeyboard);
      document.removeEventListener('focus', preventFocus, true);
    };
  }, [userAnswer, activeIndex, puzzle.length, handleKeyPress, handleSubmit]);

  // Auto-scroll active block into view when it changes (only for long words)
  useEffect(() => {
    if (puzzle.length > 8 && activeBlockRef.current && scrollContainerRef.current) {
      // Smooth scroll the active block into view, centered (like main game)
      activeBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeIndex, puzzle.length]);

  // Get current answer as array of characters
  const answerArray = userAnswer.padEnd(puzzle.length, ' ').split('');

  return (
    <>
      <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#cb6ce6', zoom: '0.85' }}>
        {/* Main Content - Game Card */}
        <div className="flex-1 flex flex-col pt-16 md:pt-12 pb-safe overflow-hidden">
        <div className="max-w-md w-full h-full mx-auto flex flex-col px-4 pb-[200px]">
          <div
            className={`rounded-[32px] border-[3px] overflow-hidden flex-1 flex flex-col shadow-[6px_6px_0px_rgba(0,0,0,1)] ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
            }`}
          >
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Header row with back button, title, and menu */}
              <div className="flex items-center justify-between mb-4 gap-2">
                {/* Back button */}
                <button
                  onClick={onBack}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Back"
                >
                  <svg
                    className={`w-5 h-5 ${highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-300'}`}
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

                {/* Center content - Date */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    Daily Puzzle {puzzle?.date ? formatDateShort(puzzle.date) : ''}
                  </span>
                </div>

                {/* Hamburger menu */}
                <div className="flex-shrink-0">
                  <HamburgerMenu
                    isOpen={isSidebarOpen}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  />
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex justify-evenly gap-4 mb-6 p-4 bg-purple-50 dark:bg-gray-800 rounded-2xl max-w-md mx-auto">
                <div className="text-center flex-1">
                  <div className={`text-xl font-bold ${highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-200'}`}>
                    {formatTime(elapsedTime)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Time
                  </div>
                </div>
                <div className="text-center flex-1">
                  <div className={`text-xl font-bold ${highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-200'}`}>
                    {attempts}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Attempts
                  </div>
                </div>
              </div>

              {/* Clue */}
              <div className="mb-8">
                <h2
                  className={`text-sm font-bold uppercase tracking-wide mb-3 ${
                    highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Cryptic Clue
                </h2>
                <div
                  className={`text-2xl md:text-3xl leading-relaxed ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {puzzle.clue}
                </div>
              </div>

              {/* Crossword-style Answer Grid - Multi-Word Support */}
              <div className="mb-6">
                <h3
                  className={`text-sm font-bold uppercase tracking-wide mb-4 ${
                    highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Your Answer{' '}
                  {isMultiWord && (
                    <span className="text-xs opacity-75">({wordPattern.length} words)</span>
                  )}
                </h3>
                <div className="relative max-w-full mb-4">
                  <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto scroll-smooth snap-x snap-proximity hide-scrollbar max-w-full"
                    style={{
                      scrollPaddingLeft: '0px',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <div className="inline-flex gap-3 items-center px-2">
                      {wordPattern.map((wordLength, wordIndex) => {
                        const wordStartIndex = getWordStartIndex(wordIndex);

                        return (
                          <div
                            key={wordIndex}
                            className={`inline-flex rounded-xl border-[3px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-200 ${
                              highContrast
                                ? 'border-hc-border dark:shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                                : 'border-black dark:border-gray-600 dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
                            }`}
                            role="group"
                            aria-label={`Word ${wordIndex + 1} of ${wordPattern.length}`}
                          >
                            {Array.from({ length: wordLength }).map((_, letterIndexInWord) => {
                              const overallIndex = wordStartIndex + letterIndexInWord;
                              const char = answerArray[overallIndex];
                              const isActive = overallIndex === activeIndex;
                              const hasValue = char && char !== ' ';
                              const isFirst = letterIndexInWord === 0;
                              const isLast = letterIndexInWord === wordLength - 1;

                              return (
                                <div
                                  key={overallIndex}
                                  ref={isActive ? activeBlockRef : null}
                                  onClick={() => handleCharacterClick(overallIndex)}
                                  className={`
                                w-9 h-11 sm:w-10 sm:h-12
                                flex items-center justify-center
                                font-bold text-lg sm:text-xl
                                uppercase
                                cursor-pointer
                                transition-all duration-150
                                select-none
                                flex-shrink-0
                                ${isFirst ? 'rounded-l-[9px]' : ''}
                                ${isLast ? 'rounded-r-[9px]' : ''}
                                ${letterIndexInWord < wordLength - 1 ? 'border-r-[2px]' : ''}
                                ${
                                  highContrast
                                    ? `border-hc-border ${
                                        isActive
                                          ? 'bg-hc-primary text-white'
                                          : 'bg-hc-background text-hc-text'
                                      }`
                                    : `border-gray-800 dark:border-gray-600 ${
                                        isActive
                                          ? 'bg-accent-blue text-white'
                                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                                      }`
                                }
                                ${isIncorrect ? 'animate-shake' : ''}
                              `}
                                  aria-label={`Letter ${letterIndexInWord + 1} of ${wordLength} in word ${wordIndex + 1}`}
                                >
                                  {hasValue ? char : ''}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {showFeedback && isIncorrect && (
                  <div className="text-center">
                    <div
                      className={`inline-block px-4 py-2 rounded-xl border-[3px] font-bold ${
                        highContrast
                          ? 'bg-hc-error text-white border-hc-border'
                          : 'bg-accent-red/20 text-red-900 dark:text-red-400 border-accent-red'
                      }`}
                    >
                      Not quite right. Try again!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Bottom Section Inside Card - Action Buttons Only */}
            <div className="p-4 pb-3 sm:p-6 sm:pb-4 flex-shrink-0">
              {/* Action Buttons */}
              <div className="max-w-2xl mx-auto">
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim()}
                    className="flex-1 px-6 py-3 text-white text-base font-bold rounded-[20px] border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                    style={userAnswer.trim() ? { backgroundColor: '#cb6ce6' } : {}}
                  >
                    Check
                  </button>
                  <button
                    onClick={() => setShowHintModal(true)}
                    className={`flex-1 px-6 py-3 font-bold rounded-[20px] border-[3px] text-base transition-all ${
                      highContrast
                        ? 'bg-hc-warning text-black border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                        : 'bg-accent-yellow text-gray-900 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    Hints ({CRYPTIC_CONFIG.MAX_HINTS - hintsUsed})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Keyboard at Bottom - Outside Card */}
        <div className="fixed bottom-0 left-0 right-0 pb-safe pt-3" style={{ backgroundColor: '#cb6ce6' }}>
          <OnScreenKeyboard
            onKeyPress={handleKeyPress}
            disabled={false}
            layout={keyboardLayout}
            checkButtonColor="#cb6ce6"
          />
        </div>
      </div>
    </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>

      {/* Modals */}
      {showGuide && <CrypticGuideModal onClose={() => setShowGuide(false)} />}
      <UnifiedArchiveCalendar isOpen={showArchive} onClose={() => setShowArchive(false)} defaultTab="cryptic" onSelectPuzzle={() => {}} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <HintModal
        isOpen={showHintModal}
        onClose={() => setShowHintModal(false)}
        puzzle={puzzle}
        hintsUsed={hintsUsed}
        unlockedHints={unlockedHints}
        onUnlockHint={handleUnlockHint}
        canUseHint={canUseHint}
      />
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowGuide(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenFeedback={() => setShowFeedback(true)}
      />

      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}
