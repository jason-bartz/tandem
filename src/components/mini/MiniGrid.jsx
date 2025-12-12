'use client';

import React from 'react';
import { isBlackSquare, isEditableCell } from '@/lib/miniUtils';
import { useTheme } from '@/contexts/ThemeContext';
import logger from '@/lib/logger';

/**
 * MiniGrid Component
 * Displays the 5x5 crossword grid with neo-brutalist styling
 *
 * @param {Object} props
 * @param {Array} props.grid - The puzzle grid (solution or user grid)
 * @param {Array} props.userGrid - User's current answers
 * @param {Array} props.clueNumbers - Grid of clue numbers
 * @param {Object} props.selectedCell - Currently selected cell {row, col}
 * @param {string} props.currentDirection - 'across' or 'down'
 * @param {Object} props.currentClue - Current clue object with cells array
 * @param {Set} props.correctCells - Set of correct cell coordinates "row,col"
 * @param {Function} props.onCellClick - Callback when cell is clicked
 * @param {boolean} props.disabled - Whether grid is disabled (e.g., not started)
 * @param {boolean} props.blur - Whether to blur the grid (start screen)
 */
export default function MiniGrid({
  grid,
  userGrid,
  clueNumbers,
  selectedCell,
  currentDirection: _currentDirection,
  currentClue,
  correctCells = new Set(),
  onCellClick,
  disabled = false,
  blur = false,
}) {
  const { highContrast } = useTheme();

  if (!grid || !userGrid || !clueNumbers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading grid...</div>
      </div>
    );
  }

  const GRID_SIZE = 5;

  // Get cells in current word for highlighting
  const highlightedCells = currentClue?.cells || [];
  logger.debug('[MiniGrid] Highlighted Cells:', JSON.stringify(highlightedCells));
  const highlightedSet = new Set(highlightedCells.map((cell) => `${cell.row},${cell.col}`));

  const getCellClasses = (row, col) => {
    const cellKey = `${row},${col}`;
    const isSelected = selectedCell.row === row && selectedCell.col === col;
    const isHighlighted = highlightedSet.has(cellKey);
    const isCorrect = correctCells.has(cellKey);
    const isBlack = isBlackSquare(grid[row][col]);
    const isEditable = isEditableCell(grid, row, col);

    const baseClasses = 'relative flex items-center justify-center font-bold text-lg sm:text-xl';

    if (isBlack) {
      return `${baseClasses} bg-gray-900 dark:bg-gray-950`;
    }

    if (!isEditable) {
      return `${baseClasses} bg-gray-200 dark:bg-gray-800 cursor-not-allowed`;
    }

    let bgClass = 'bg-ghost-white dark:bg-gray-900';

    if (isSelected) {
      // Selected cell is always blue (priority over correct)
      bgClass = highContrast
        ? 'bg-hc-primary text-white'
        : 'bg-accent-blue dark:bg-accent-blue text-gray-900';
    } else if (isCorrect) {
      // Correct cells are green
      bgClass = highContrast
        ? 'bg-hc-success text-black'
        : 'bg-accent-green dark:bg-accent-green text-gray-900';
    } else if (isHighlighted) {
      // Highlighted cells (rest of current word) are grey
      bgClass = highContrast ? 'bg-gray-300 text-black' : 'bg-gray-200 dark:bg-gray-700';
    }
    // REMOVED: Row/column highlighting that was confusing the visual presentation
    // The word highlighting is sufficient and more clear

    const cursorClass = disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-accent-blue/20';

    return `${baseClasses} ${bgClass} ${cursorClass} transition-colors duration-150`;
  };

  const handleCellClick = (row, col) => {
    if (disabled || !isEditableCell(grid, row, col)) return;
    onCellClick?.(row, col);
  };

  return (
    <div className={`w-full max-w-md mx-auto ${blur ? 'filter blur-md' : ''}`}>
      {/* Grid container with neo-brutalist border */}
      <div
        className="
          rounded-[16px]
          border-[3px] border-black dark:border-gray-600
          shadow-[4px_4px_0px_rgba(0,0,0,1)]
          dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
          overflow-hidden
          bg-ghost-white dark:bg-gray-900
        "
      >
        {/* Grid */}
        <div className="grid grid-cols-5 gap-0">
          {Array.from({ length: GRID_SIZE }).map((_, rowIndex) =>
            Array.from({ length: GRID_SIZE }).map((_, colIndex) => {
              const cellValue = userGrid[rowIndex]?.[colIndex] || '';
              const clueNumber = clueNumbers[rowIndex]?.[colIndex];
              const isBlack = isBlackSquare(grid[rowIndex][colIndex]);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square
                    border-r-[2px] border-b-[2px]
                    last:border-r-0
                    border-black dark:border-gray-700
                    ${getCellClasses(rowIndex, colIndex)}
                  `}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  role="gridcell"
                  aria-label={`Cell ${rowIndex + 1}, ${colIndex + 1}${clueNumber ? `, clue ${clueNumber}` : ''}`}
                  aria-selected={selectedCell.row === rowIndex && selectedCell.col === colIndex}
                  tabIndex={disabled ? -1 : 0}
                >
                  {/* Clue number */}
                  {!isBlack && clueNumber && (
                    <span
                      className="
                        absolute top-0.5 left-0.5
                        text-[10px] sm:text-xs
                        font-bold
                        text-gray-700 dark:text-gray-300
                      "
                    >
                      {clueNumber}
                    </span>
                  )}

                  {/* Cell content */}
                  {!isBlack && (
                    <span
                      className={`
                        ${clueNumber ? 'mt-2' : ''}
                        text-lg sm:text-xl md:text-2xl
                        font-bold
                        select-none
                      `}
                    >
                      {cellValue}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
