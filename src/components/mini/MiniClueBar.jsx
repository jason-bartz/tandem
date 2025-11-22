'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * MiniClueBar Component
 * Displays the current clue above the keyboard (Ponder Club style)
 * Allows navigation between clues with arrow buttons
 *
 * @param {Object} props
 * @param {Object} props.currentClue - Current clue object {number, clue, direction}
 * @param {Object} props.puzzle - Full puzzle object with clues
 * @param {Function} props.onNavigateNext - Callback to navigate to next clue
 * @param {Function} props.onNavigatePrevious - Callback to navigate to previous clue
 * @param {Function} props.onClueClick - Callback when clue text is clicked
 */
export default function MiniClueBar({
  currentClue,
  puzzle,
  onNavigateNext,
  onNavigatePrevious,
  onClueClick,
}) {
  const { highContrast } = useTheme();

  if (!currentClue || !puzzle) {
    return (
      <div className="w-full py-4 px-2">
        <div
          className="
            rounded-[16px]
            border-[3px] border-black dark:border-gray-600
            shadow-[3px_3px_0px_rgba(0,0,0,1)]
            dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
            bg-white dark:bg-gray-800
            p-4
            text-center
            text-text-secondary
          "
        >
          Select a cell to see the clue
        </div>
      </div>
    );
  }

  const { clueNumber, direction, clue } = currentClue;

  // Find the actual clue text from the puzzle
  const clueList = direction === 'across' ? puzzle.clues?.across : puzzle.clues?.down;
  const clueData = clueList?.find((c) => c.number === clueNumber);
  const clueText = clueData?.clue || clue || '';

  // Format direction display
  const directionLabel = direction === 'across' ? 'A' : 'D';
  const directionColor = highContrast
    ? 'bg-hc-primary text-white'
    : 'bg-accent-yellow dark:bg-accent-yellow text-gray-900';

  return (
    <div className="w-full max-w-md mx-auto py-2 px-2">
      <div
        className="
          rounded-[16px]
          border-[3px] border-black dark:border-gray-600
          shadow-[3px_3px_0px_rgba(0,0,0,1)]
          dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
          bg-white dark:bg-gray-800
          overflow-hidden
        "
      >
        <div className="flex items-center gap-2 p-3">
          {/* Previous button */}
          <button
            onClick={onNavigatePrevious}
            className="
              flex-shrink-0
              w-10 h-10
              rounded-[12px]
              border-[2px] border-black dark:border-gray-600
              shadow-[2px_2px_0px_rgba(0,0,0,1)]
              dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]
              bg-white dark:bg-gray-700
              flex items-center justify-center
              hover:translate-x-[1px] hover:translate-y-[1px]
              hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]
              active:translate-x-[2px] active:translate-y-[2px]
              active:shadow-none
              transition-all
            "
            aria-label="Previous clue"
          >
            <span className="text-xl text-text-primary">‹</span>
          </button>

          {/* Clue content */}
          <button
            onClick={onClueClick}
            className="
              flex-1
              flex flex-col
              text-center
              min-w-0
              py-1
            "
            aria-label={`${clueNumber}${directionLabel}: ${clueText}`}
          >
            {/* Clue number and direction badge - centered above */}
            <div className="flex items-center justify-center mb-1">
              <div
                className={`
                  px-2 py-1
                  rounded-[8px]
                  border-[2px] border-black dark:border-gray-600
                  shadow-[2px_2px_0px_rgba(0,0,0,1)]
                  dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]
                  ${directionColor}
                  font-bold
                  text-sm
                `}
              >
                {clueNumber}{directionLabel}
              </div>
            </div>

            {/* Clue text - centered below */}
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-text-primary truncate">
                {clueText}
              </p>
            </div>
          </button>

          {/* Next button */}
          <button
            onClick={onNavigateNext}
            className="
              flex-shrink-0
              w-10 h-10
              rounded-[12px]
              border-[2px] border-black dark:border-gray-600
              shadow-[2px_2px_0px_rgba(0,0,0,1)]
              dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]
              bg-white dark:bg-gray-700
              flex items-center justify-center
              hover:translate-x-[1px] hover:translate-y-[1px]
              hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]
              active:translate-x-[2px] active:translate-y-[2px]
              active:shadow-none
              transition-all
            "
            aria-label="Next clue"
          >
            <span className="text-xl text-text-primary">›</span>
          </button>
        </div>

        {/* Optional: Show word pattern if available */}
        {clueData?.length && (
          <div className="px-3 pb-2">
            <div className="text-xs text-text-secondary">
              {clueData.length} letters
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
