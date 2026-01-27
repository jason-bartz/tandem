'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { formatMiniTime, getMiniPuzzleInfoForDate } from '@/lib/miniUtils';
import { generateMiniShareText } from '@/lib/miniShareText';
import MiniGrid from './MiniGrid';
import ShareButton from '../game/ShareButton';
import UnifiedStatsModal from '../stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '../game/UnifiedArchiveCalendar';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import { formatDateShort } from '@/lib/utils';

/**
 * MiniAdmireScreen Component
 * Shows completed puzzle in read-only mode with replay option
 */
export default function MiniAdmireScreen({
  puzzle,
  userGrid,
  solutionGrid,
  clueNumbers,
  elapsedTime,
  checksUsed,
  revealsUsed,
  mistakes,
  currentPuzzleDate,
}) {
  const router = useRouter();
  const { lightTap } = useHaptics();
  const { highContrast } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const perfectSolve = checksUsed === 0 && revealsUsed === 0 && mistakes === 0;
  const puzzleInfo = getMiniPuzzleInfoForDate(currentPuzzleDate);
  const puzzleNumber = puzzleInfo?.number || puzzle?.number || 0;

  // Generate share text
  const shareText = generateMiniShareText(
    { date: currentPuzzleDate, number: puzzleNumber },
    {
      timeTaken: elapsedTime,
      checksUsed,
      revealsUsed,
      mistakes,
      perfectSolve,
    }
  );

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
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
              {/* Completion Badge */}
              <div className="text-center mb-4">
                <div className="text-2xl font-black text-text-primary mb-1">
                  {perfectSolve ? 'Perfect Solve!' : 'Completed!'}
                </div>
                <div className="text-sm text-text-secondary">Daily Mini #{puzzleNumber}</div>
              </div>

              {/* Stats - Time */}
              <div className="mb-4">
                <div
                  className="
                    rounded-[16px]
                    border-[2px] border-black dark:border-gray-600
                    shadow-[3px_3px_0px_rgba(0,0,0,1)]
                    dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                    bg-accent-yellow/20 dark:bg-accent-yellow/10
                    p-4
                    text-center
                  "
                >
                  <div className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-1">
                    Time
                  </div>
                  <div className="text-2xl font-black text-text-primary">
                    {formatMiniTime(elapsedTime)}
                  </div>
                </div>
              </div>

              {/* Completed Grid - Read-only view */}
              <div className="flex items-center justify-center mb-4">
                <MiniGrid
                  grid={solutionGrid}
                  userGrid={userGrid}
                  clueNumbers={clueNumbers}
                  selectedCell={{ row: 0, col: 0 }}
                  currentDirection="across"
                  currentClue={null}
                  correctCells={new Set()}
                  onCellClick={() => {}}
                  disabled={true}
                  blur={false}
                />
              </div>

              {/* Share button */}
              <div className="mb-4">
                <ShareButton shareText={shareText} />
              </div>

              {/* Action buttons */}
              <div className="space-y-2 mt-auto">
                <button
                  onClick={() => {
                    lightTap();
                    setShowArchive(true);
                  }}
                  className="
                    w-full h-10
                    rounded-[12px]
                    border-[2px] border-black dark:border-gray-600
                    shadow-[3px_3px_0px_rgba(0,0,0,1)]
                    dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                    bg-ghost-white dark:bg-gray-700
                    text-text-primary
                    font-bold text-sm
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                    active:translate-x-[3px] active:translate-y-[3px]
                    active:shadow-none
                    transition-all
                  "
                >
                  Play Archive
                </button>

                <button
                  onClick={() => {
                    lightTap();
                    setShowStats(true);
                  }}
                  className="
                    w-full h-10
                    rounded-[12px]
                    border-[2px] border-black dark:border-gray-600
                    shadow-[3px_3px_0px_rgba(0,0,0,1)]
                    dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                    bg-ghost-white dark:bg-gray-700
                    text-text-primary
                    font-bold text-sm
                    hover:translate-x-[2px] hover:translate-y-[2px]
                    hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                    active:translate-x-[3px] active:translate-y-[3px]
                    active:shadow-none
                    transition-all
                  "
                >
                  View Stats
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Menu */}
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
      />

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} defaultTab="mini" />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          router.push(`/dailymini?date=${date}`);
        }}
        defaultTab="mini"
      />
    </>
  );
}
