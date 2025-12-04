'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MiniGrid from './MiniGrid';
import MiniClueBar from './MiniClueBar';
import OnScreenKeyboard from '../game/OnScreenKeyboard';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '../game/UnifiedArchiveCalendar';
import HowToPlayModal from '../game/HowToPlayModal';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { formatMiniTime } from '@/lib/miniUtils';
import { formatDateShort } from '@/lib/utils';

/**
 * MiniGameScreen Component
 * Main crossword gameplay screen with fixed layout (no scrolling)
 */
export default function MiniGameScreen({
  puzzle,
  userGrid,
  solutionGrid,
  clueNumbers,
  selectedCell,
  direction,
  currentClue,
  elapsedTime,
  isPaused: _isPaused,
  checksUsed: _checksUsed,
  revealsUsed: _revealsUsed,
  mistakes: _mistakes,
  autoCheck,
  correctCells,
  handleLetterInput,
  handleBackspace,
  selectCell,
  navigateToNextClue,
  navigateToNextClueInSection,
  navigateToPreviousClue,
  navigateToClue: _navigateToClue,
  pauseGame: _pauseGame,
  resumeGame: _resumeGame,
  checkCell,
  checkWord,
  checkPuzzle,
  revealCell,
  revealWord,
  revealPuzzle,
  toggleAutoCheck,
}) {
  const router = useRouter();
  const { highContrast, reduceMotion } = useTheme();
  const { mediumTap, lightTap } = useHaptics();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Physical keyboard support
  useEffect(() => {
    const handlePhysicalKeyboard = (e) => {
      // Ignore if modal is open
      if (showCheckModal || showRevealModal) return;

      // Ignore if input/textarea is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        // Tab advances to the next clue in the current section
        navigateToNextClueInSection();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        handleArrowKey(e.key);
      } else if (e.key === ' ') {
        e.preventDefault();
        // Space could toggle direction
        selectCell(selectedCell.row, selectedCell.col);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleLetterInput(e.key);
      }
    };

    document.addEventListener('keydown', handlePhysicalKeyboard);
    return () => document.removeEventListener('keydown', handlePhysicalKeyboard);
  }, [
    showCheckModal,
    showRevealModal,
    selectedCell,
    handleLetterInput,
    handleBackspace,
    navigateToNextClueInSection,
    selectCell,
  ]);

  const handleArrowKey = useCallback(
    (key) => {
      const { row, col } = selectedCell;
      let newRow = row;
      let newCol = col;

      switch (key) {
        case 'ArrowUp':
          newRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(4, row + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(4, col + 1);
          break;
      }

      if (newRow !== row || newCol !== col) {
        selectCell(newRow, newCol);
      }
    },
    [selectedCell, selectCell]
  );

  const handleCheckClick = () => {
    setShowCheckModal(true);
    mediumTap();
  };

  const handleRevealClick = () => {
    setShowRevealModal(true);
    mediumTap();
  };

  const handleCheckAction = (action) => {
    mediumTap();
    switch (action) {
      case 'cell':
        checkCell();
        break;
      case 'word':
        checkWord();
        break;
      case 'puzzle':
        checkPuzzle();
        break;
    }
    setShowCheckModal(false);
  };

  const handleRevealAction = (action) => {
    mediumTap();
    switch (action) {
      case 'cell':
        revealCell();
        break;
      case 'word':
        revealWord();
        break;
      case 'puzzle':
        revealPuzzle();
        break;
    }
    setShowRevealModal(false);
  };

  const handleAutoCheckToggle = () => {
    toggleAutoCheck();
    mediumTap();
  };

  const handleKeyPress = (key) => {
    if (key === 'ENTER') {
      // ENTER key now acts as Tab - advances to next clue in section
      navigateToNextClueInSection();
    } else if (key === 'BACKSPACE') {
      handleBackspace();
    } else {
      handleLetterInput(key);
    }
  };

  if (!puzzle || !solutionGrid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-secondary">Loading game...</p>
      </div>
    );
  }

  console.log('[MiniGameScreen] Rendering with currentClue:', JSON.stringify(currentClue));

  return (
    <>
      <div className="fixed inset-0 flex flex-col bg-bg-main dark:bg-bg-main overflow-hidden">
        {/* Main game card */}
        <div className="flex-1 flex flex-col max-w-md w-full mx-auto">
          <div
            className={`rounded-[32px] border-[3px] overflow-hidden flex-1 flex flex-col m-4 ${
              highContrast
                ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            }`}
          >
            {/* Header - back button, title/date, and hamburger menu */}
            <header
              className={`pt-4 pb-4 px-3 sm:px-5 flex items-center justify-between flex-shrink-0 ${
                highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-bg-card'
              }`}
            >
              {/* Back button */}
              <button
                onClick={() => {
                  lightTap();
                  router.push('/');
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
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

              {/* Center content - Title and date */}
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
            </header>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
              {/* Timer and Check/Reveal Buttons */}
              <div className="flex items-center justify-between mb-3">
                {/* Check Button */}
                <button
                  onClick={handleCheckClick}
                  className="flex items-center gap-1 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Check answers"
                >
                  <Image
                    src="/icons/ui/check.png"
                    alt="Check"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-text-primary">Check</span>
                </button>

                {/* Centered Timer */}
                <div className="font-bold text-text-primary text-base">
                  {formatMiniTime(elapsedTime)}
                </div>

                {/* Reveal Button */}
                <button
                  onClick={handleRevealClick}
                  className="flex items-center gap-1 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Reveal answers"
                >
                  <Image
                    src="/icons/ui/eye.png"
                    alt="Reveal"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-text-primary">Reveal</span>
                </button>
              </div>

              {/* Grid - Fixed height container to prevent shifting */}
              <div className="flex items-center justify-center" style={{ minHeight: '320px' }}>
                <MiniGrid
                  grid={solutionGrid}
                  userGrid={userGrid}
                  clueNumbers={clueNumbers}
                  selectedCell={selectedCell}
                  currentDirection={direction}
                  currentClue={currentClue}
                  correctCells={correctCells}
                  onCellClick={selectCell}
                  disabled={false}
                />
              </div>

              {/* Clue Bar - Fixed position */}
              <div className="mt-auto pt-2">
                <MiniClueBar
                  currentClue={currentClue}
                  puzzle={puzzle}
                  onNavigateNext={navigateToNextClue}
                  onNavigatePrevious={navigateToPreviousClue}
                  onClueClick={() => {}}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard - outside the card */}
        <div className="safe-area-bottom pb-4">
          <OnScreenKeyboard
            onKeyPress={handleKeyPress}
            disabled={false}
            checkButtonColor="#ffce00"
            actionKeyType="tab"
          />
        </div>
      </div>

      {/* Sidebar Menu */}
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenFeedback={() => setShowFeedback(true)}
      />

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          router.push(`/dailymini?date=${date}`);
        }}
        defaultTab="mini"
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        defaultTab="mini"
      />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Check Pane */}
      {showCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCheckModal(false)}>
          <div
            className={`
              fixed bottom-0 left-0 right-0
              rounded-t-[32px]
              border-t-[3px] border-l-[3px] border-r-[3px] border-black dark:border-gray-600
              p-6 pb-8
              max-w-md mx-auto
              ${highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-gray-800'}
              ${reduceMotion ? '' : 'animate-slide-up'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-text-primary">Check Answers</h2>
              <button
                onClick={() => setShowCheckModal(false)}
                className="
                  w-8 h-8
                  rounded-[8px]
                  border-[2px] border-black dark:border-gray-600
                  bg-ghost-white dark:bg-gray-700
                  flex items-center justify-center
                "
                aria-label="Close"
              >
                <svg
                  className="w-4 h-4 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Check options */}
            <div className="mb-6">
              <div className="space-y-2">
                <button
                  onClick={() => handleCheckAction('cell')}
                  className="w-full px-4 py-3 rounded-[12px] border-[2px] border-black dark:border-gray-600 bg-ghost-white dark:bg-gray-700 text-left text-sm font-medium text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Check Square
                </button>
                <button
                  onClick={() => handleCheckAction('word')}
                  className="w-full px-4 py-3 rounded-[12px] border-[2px] border-black dark:border-gray-600 bg-ghost-white dark:bg-gray-700 text-left text-sm font-medium text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Check Word
                </button>
                <button
                  onClick={() => handleCheckAction('puzzle')}
                  className="w-full px-4 py-3 rounded-[12px] border-[2px] border-black dark:border-gray-600 bg-ghost-white dark:bg-gray-700 text-left text-sm font-medium text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Check Puzzle
                </button>
              </div>
            </div>

            {/* Auto-check toggle */}
            <div>
              <button
                onClick={handleAutoCheckToggle}
                className={`
                  w-full px-4 py-3
                  rounded-[12px]
                  border-[2px] border-black dark:border-gray-600
                  text-sm font-medium
                  transition-colors
                  ${
                    autoCheck
                      ? 'bg-accent-yellow dark:bg-accent-yellow text-gray-900'
                      : 'bg-ghost-white dark:bg-gray-700 text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                {autoCheck ? '✓ Auto-Check Enabled' : 'Enable Auto-Check'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal Pane */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowRevealModal(false)}>
          <div
            className={`
              fixed bottom-0 left-0 right-0
              rounded-t-[32px]
              border-t-[3px] border-l-[3px] border-r-[3px] border-black dark:border-gray-600
              p-6 pb-8
              max-w-md mx-auto
              ${highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-gray-800'}
              ${reduceMotion ? '' : 'animate-slide-up'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-text-primary">Reveal Answers</h2>
              <button
                onClick={() => setShowRevealModal(false)}
                className="
                  w-8 h-8
                  rounded-[8px]
                  border-[2px] border-black dark:border-gray-600
                  bg-ghost-white dark:bg-gray-700
                  flex items-center justify-center
                "
                aria-label="Close"
              >
                <svg
                  className="w-4 h-4 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Reveal options */}
            <div>
              <div className="space-y-2">
                <button
                  onClick={() => handleRevealAction('cell')}
                  className="w-full px-4 py-3 rounded-[12px] border-[2px] border-black dark:border-gray-600 bg-ghost-white dark:bg-gray-700 text-left text-sm font-medium text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Reveal Square
                </button>
                <button
                  onClick={() => handleRevealAction('word')}
                  className="w-full px-4 py-3 rounded-[12px] border-[2px] border-black dark:border-gray-600 bg-ghost-white dark:bg-gray-700 text-left text-sm font-medium text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Reveal Word
                </button>
                <button
                  onClick={() => handleRevealAction('puzzle')}
                  className="w-full px-4 py-3 rounded-[12px] border-[2px] border-black dark:border-gray-600 bg-ghost-white dark:bg-gray-700 text-left text-sm font-medium text-text-primary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Reveal Puzzle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
