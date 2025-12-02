'use client';

import React from 'react';

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
  const clueEntry = clueList?.find((c) => c.number === clueNumber);
  const clueText = clueEntry?.clue || clue || '';

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
        <div className="flex items-center gap-2 p-3 min-h-[72px]">
          {/* Previous button */}
          <button
            onClick={onNavigatePrevious}
            className="
              flex-shrink-0
              w-10 h-10
              rounded-[12px]
              bg-transparent
              flex items-center justify-center
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:bg-gray-200 dark:active:bg-gray-600
              transition-colors
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
              flex items-center justify-center
              text-center
              min-w-0
              py-1
            "
            aria-label={`Clue: ${clueText}`}
          >
            {/* Clue text - centered, allows wrapping */}
            <p className="text-sm sm:text-base font-medium text-text-primary line-clamp-2">
              {clueText}
            </p>
          </button>

          {/* Next button */}
          <button
            onClick={onNavigateNext}
            className="
              flex-shrink-0
              w-10 h-10
              rounded-[12px]
              bg-transparent
              flex items-center justify-center
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:bg-gray-200 dark:active:bg-gray-600
              transition-colors
            "
            aria-label="Next clue"
          >
            <span className="text-xl text-text-primary">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
