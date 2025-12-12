/**
 * Daily Mini - Crossword Utilities
 *
 * Core utilities for 5x5 crossword puzzle logic including:
 * - Grid navigation and cell management
 * - Clue numbering and word detection
 * - Answer validation
 * - Cell state calculations
 */

import logger from '@/lib/logger';

// Constants
export const GRID_SIZE = 5;
export const BLACK_SQUARE = '■';
export const EMPTY_CELL = '';

export const DIRECTION = {
  ACROSS: 'across',
  DOWN: 'down',
};

/**
 * Get puzzle number for a given date (Mini starts same day as Tandem)
 */
export function getMiniPuzzleNumber(targetDate = null) {
  // Start from the first puzzle: November 21, 2025
  const start = new Date('2025-11-21');
  const target = targetDate ? new Date(targetDate) : new Date();

  const diffTime = target - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Puzzle #1 is November 21, 2025
  return diffDays + 1;
}

/**
 * Get current Mini puzzle info (date, number, etc.)
 */
export function getCurrentMiniPuzzleInfo() {
  const now = new Date();
  const localDate = new Date(now);
  localDate.setHours(0, 0, 0, 0);

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  // Format as ISO date string in local timezone
  const isoDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

  return {
    number: getMiniPuzzleNumber(),
    date: now.toLocaleDateString('en-US', options),
    isoDate: isoDate,
  };
}

/**
 * Get Mini puzzle info for a specific date
 */
export function getMiniPuzzleInfoForDate(date) {
  const d = new Date(date);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return {
    number: getMiniPuzzleNumber(date),
    date: d.toLocaleDateString('en-US', options),
    isoDate: date,
  };
}

/**
 * Check if a cell is a black square
 */
export function isBlackSquare(cell) {
  return cell === BLACK_SQUARE || cell === '.' || cell === '#' || cell === null;
}

/**
 * Check if coordinates are within grid bounds
 */
export function isValidCoordinate(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

/**
 * Check if a cell can be edited (not black, within bounds)
 */
export function isEditableCell(grid, row, col) {
  if (!isValidCoordinate(row, col)) return false;
  if (!grid || !grid[row]) return false;
  return !isBlackSquare(grid[row][col]);
}

/**
 * Generate clue numbers for the grid
 * A cell gets a number if it starts an across or down word
 */
export function generateClueNumbers(grid) {
  const clueNumbers = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  let clueNumber = 1;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (isBlackSquare(grid[row][col])) continue;

      const startsAcross =
        (col === 0 || isBlackSquare(grid[row][col - 1])) &&
        col < GRID_SIZE - 1 &&
        !isBlackSquare(grid[row][col + 1]);

      const startsDown =
        (row === 0 || isBlackSquare(grid[row - 1][col])) &&
        row < GRID_SIZE - 1 &&
        !isBlackSquare(grid[row + 1][col]);

      if (startsAcross || startsDown) {
        clueNumbers[row][col] = clueNumber;
        clueNumber++;
      }
    }
  }

  return clueNumbers;
}

/**
 * Get all cells for a specific word starting at a position
 * More efficient/direct than searching by clue number
 */
export function getWordCellsFromPosition(grid, startRow, startCol, direction) {
  const cells = [];

  logger.debug(
    `[getWordCellsFromPosition] Called with startRow=${startRow}, startCol=${startCol}, direction=${direction}`
  );

  if (direction === DIRECTION.DOWN) {
    // DOWN - iterate through rows (vertical)
    let row = startRow;
    while (row < GRID_SIZE && !isBlackSquare(grid[row][startCol])) {
      cells.push({ row, col: startCol });
      row++;
    }
    logger.debug(`[getWordCellsFromPosition] DOWN cells:`, JSON.stringify(cells));
  } else {
    // ACROSS - iterate through columns (horizontal)
    let col = startCol;
    while (col < GRID_SIZE && !isBlackSquare(grid[startRow][col])) {
      cells.push({ row: startRow, col });
      col++;
    }
    logger.debug(`[getWordCellsFromPosition] ACROSS cells:`, JSON.stringify(cells));
  }

  return cells;
}

/**
 * Get all cells for a specific word (across or down)
 * Returns array of {row, col} coordinates
 */
export function getWordCells(grid, clueNumbers, clueNumber, direction) {
  // Find the starting cell for this clue number
  let startRow = -1;
  let startCol = -1;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (clueNumbers[row][col] === clueNumber) {
        startRow = row;
        startCol = col;
        break;
      }
    }
    if (startRow !== -1) break;
  }

  if (startRow === -1) return [];

  return getWordCellsFromPosition(grid, startRow, startCol, direction);
}

/**
 * Get the clue that a specific cell belongs to
 * Returns { clueNumber, direction, cells }
 */
export function getClueForCell(grid, clueNumbers, row, col, preferredDirection = null) {
  if (!isEditableCell(grid, row, col)) return null;

  // Helper to construct the clue object if a word exists in that direction
  const getClue = (dir) => {
    let startRow = row;
    let startCol = col;

    if (dir === DIRECTION.ACROSS) {
      // Find start of Across word
      while (startCol > 0 && !isBlackSquare(grid[row][startCol - 1])) {
        startCol--;
      }
      // Check if it's a valid word (has a clue number)
      const clueNumber = clueNumbers[row][startCol];
      if (!clueNumber) return null;

      // Get cells
      const cells = getWordCellsFromPosition(grid, row, startCol, DIRECTION.ACROSS);
      if (cells.length < 2) return null; // Minimum 2 letters for a word

      return { clueNumber, direction: DIRECTION.ACROSS, cells };
    } else {
      // Find start of Down word
      while (startRow > 0 && !isBlackSquare(grid[startRow - 1][col])) {
        startRow--;
      }
      // Check if it's a valid word (has a clue number)
      const clueNumber = clueNumbers[startRow][col];
      if (!clueNumber) return null;

      // Get cells
      const cells = getWordCellsFromPosition(grid, startRow, col, DIRECTION.DOWN);
      if (cells.length < 2) return null; // Minimum 2 letters for a word

      return { clueNumber, direction: DIRECTION.DOWN, cells };
    }
  };

  // 1. Try preferred direction
  if (preferredDirection) {
    const clue = getClue(preferredDirection);
    if (clue) {
      logger.debug(`[getClueForCell] Found preferred ${preferredDirection}:`, JSON.stringify(clue));
      return clue;
    }
  }

  // 2. Fallback: Try Across
  const acrossClue = getClue(DIRECTION.ACROSS);
  if (acrossClue) {
    logger.debug('[getClueForCell] Fallback Across:', JSON.stringify(acrossClue));
    return acrossClue;
  }

  // 3. Fallback: Try Down
  const downClue = getClue(DIRECTION.DOWN);
  if (downClue) {
    logger.debug('[getClueForCell] Fallback Down:', JSON.stringify(downClue));
    return downClue;
  }

  // 4. Last resort: Return single cell info (shouldn't happen in valid grid)
  return {
    clueNumber: 0,
    direction: preferredDirection || DIRECTION.ACROSS,
    cells: [{ row, col }],
  };
}
/**
 * Navigate to the next cell in a direction
 * Skips black squares and wraps within the current word
 */
export function getNextCell(grid, clueNumbers, row, col, direction, forward = true) {
  const currentClue = getClueForCell(grid, clueNumbers, row, col, direction);
  if (!currentClue) return { row, col };

  const cells = currentClue.cells;
  const currentIndex = cells.findIndex((cell) => cell.row === row && cell.col === col);

  if (currentIndex === -1) return { row, col };

  let nextIndex;
  if (forward) {
    nextIndex = currentIndex + 1;
    if (nextIndex >= cells.length) {
      // Stay at the last cell
      nextIndex = cells.length - 1;
    }
  } else {
    nextIndex = currentIndex - 1;
    if (nextIndex < 0) {
      // Stay at the first cell
      nextIndex = 0;
    }
  }

  return cells[nextIndex];
}

/**
 * Navigate to next clue (for clue navigation)
 */
export function getNextClue(
  clues,
  currentClueNumber,
  currentDirection,
  grid = null,
  clueNumbers = null
) {
  const allClues = [];

  // Build ordered list: all across clues, then all down clues
  if (clues.across) {
    clues.across.forEach((clue) => {
      allClues.push({ ...clue, direction: DIRECTION.ACROSS });
    });
  }
  if (clues.down) {
    clues.down.forEach((clue) => {
      allClues.push({ ...clue, direction: DIRECTION.DOWN });
    });
  }

  // Find current clue index
  const currentIndex = allClues.findIndex(
    (clue) => clue.number === currentClueNumber && clue.direction === currentDirection
  );

  if (currentIndex === -1) return allClues[0] || null;

  // Get next clue (wrap to beginning)
  const nextIndex = (currentIndex + 1) % allClues.length;
  const nextClue = allClues[nextIndex];

  // Add cells if grid and clueNumbers are provided
  if (grid && clueNumbers && nextClue) {
    const cells = getWordCells(grid, clueNumbers, nextClue.number, nextClue.direction);
    return { ...nextClue, cells };
  }

  return nextClue;
}

/**
 * Navigate to next clue within the same section (Across or Down)
 * Wraps to the beginning of the section when reaching the end
 */
export function getNextClueInSection(
  clues,
  currentClueNumber,
  currentDirection,
  grid = null,
  clueNumbers = null
) {
  // Get clues for the current section only
  const sectionClues =
    currentDirection === DIRECTION.ACROSS
      ? (clues.across || []).map((clue) => ({ ...clue, direction: DIRECTION.ACROSS }))
      : (clues.down || []).map((clue) => ({ ...clue, direction: DIRECTION.DOWN }));

  if (sectionClues.length === 0) return null;

  // Find current clue index within the section
  const currentIndex = sectionClues.findIndex((clue) => clue.number === currentClueNumber);

  if (currentIndex === -1) return sectionClues[0] || null;

  // Get next clue (wrap to beginning of section)
  const nextIndex = (currentIndex + 1) % sectionClues.length;
  const nextClue = sectionClues[nextIndex];

  // Add cells if grid and clueNumbers are provided
  if (grid && clueNumbers && nextClue) {
    const cells = getWordCells(grid, clueNumbers, nextClue.number, nextClue.direction);
    return { ...nextClue, cells };
  }

  return nextClue;
}

/**
 * Navigate to previous clue
 */
export function getPreviousClue(
  clues,
  currentClueNumber,
  currentDirection,
  grid = null,
  clueNumbers = null
) {
  const allClues = [];

  // Build ordered list: all across clues, then all down clues
  if (clues.across) {
    clues.across.forEach((clue) => {
      allClues.push({ ...clue, direction: DIRECTION.ACROSS });
    });
  }
  if (clues.down) {
    clues.down.forEach((clue) => {
      allClues.push({ ...clue, direction: DIRECTION.DOWN });
    });
  }

  // Find current clue index
  const currentIndex = allClues.findIndex(
    (clue) => clue.number === currentClueNumber && clue.direction === currentDirection
  );

  if (currentIndex === -1) return allClues[0] || null;

  // Get previous clue (wrap to end)
  const prevIndex = currentIndex === 0 ? allClues.length - 1 : currentIndex - 1;
  const prevClue = allClues[prevIndex];

  // Add cells if grid and clueNumbers are provided
  if (grid && clueNumbers && prevClue) {
    const cells = getWordCells(grid, clueNumbers, prevClue.number, prevClue.direction);
    return { ...prevClue, cells };
  }

  return prevClue;
}

/**
 * Check if a specific cell is correct
 */
export function isCellCorrect(userGrid, solutionGrid, row, col) {
  if (!isValidCoordinate(row, col)) return false;
  if (!userGrid || !solutionGrid) return false;
  if (isBlackSquare(solutionGrid[row][col])) return true;

  const userValue = (userGrid[row][col] || '').toUpperCase();
  const solutionValue = (solutionGrid[row][col] || '').toUpperCase();

  return userValue === solutionValue && userValue !== '';
}

/**
 * Check if an entire word is correct
 */
export function isWordCorrect(userGrid, solutionGrid, clueNumbers, clueNumber, direction) {
  const cells = getWordCells(solutionGrid, clueNumbers, clueNumber, direction);

  return cells.every((cell) => isCellCorrect(userGrid, solutionGrid, cell.row, cell.col));
}

/**
 * Check if the entire puzzle is complete and correct
 */
export function isPuzzleComplete(userGrid, solutionGrid) {
  if (!userGrid || !solutionGrid) return false;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (isBlackSquare(solutionGrid[row][col])) continue;

      if (!isCellCorrect(userGrid, solutionGrid, row, col)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Count filled cells (excluding black squares)
 */
export function countFilledCells(userGrid, solutionGrid) {
  let filled = 0;
  let total = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (isBlackSquare(solutionGrid[row][col])) continue;

      total++;
      if (userGrid[row] && userGrid[row][col] && userGrid[row][col] !== EMPTY_CELL) {
        filled++;
      }
    }
  }

  return { filled, total };
}

/**
 * Get all clues with their answers for a puzzle
 * Useful for validation and display
 */
export function extractCluesFromGrid(grid, clues) {
  const clueNumbers = generateClueNumbers(grid);
  const result = {
    across: [],
    down: [],
  };

  // Process across clues
  if (clues.across) {
    clues.across.forEach((clue) => {
      const cells = getWordCells(grid, clueNumbers, clue.number, DIRECTION.ACROSS);

      result.across.push({
        ...clue,
        cells,
        length: cells.length,
      });
    });
  }

  // Process down clues
  if (clues.down) {
    clues.down.forEach((clue) => {
      const cells = getWordCells(grid, clueNumbers, clue.number, DIRECTION.DOWN);

      result.down.push({
        ...clue,
        cells,
        length: cells.length,
      });
    });
  }

  return result;
}

/**
 * Create an empty grid
 */
export function createEmptyGrid() {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(EMPTY_CELL));
}

/**
 * Clone a grid (deep copy)
 */
export function cloneGrid(grid) {
  if (!grid) return createEmptyGrid();
  return grid.map((row) => [...row]);
}

/**
 * Format time for display (MM:SS or SS if under 1 minute)
 */
export function formatMiniTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate puzzle structure
 * Returns { valid: boolean, errors: string[] }
 */
export function validatePuzzleStructure(grid, clues) {
  const errors = [];

  // Check grid size
  if (!grid || grid.length !== GRID_SIZE) {
    errors.push('Grid must be 5x5');
    return { valid: false, errors };
  }

  for (let row = 0; row < GRID_SIZE; row++) {
    if (!grid[row] || grid[row].length !== GRID_SIZE) {
      errors.push(`Row ${row} must have ${GRID_SIZE} cells`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Generate clue numbers
  const clueNumbers = generateClueNumbers(grid);

  // Check all across clues
  if (clues.across) {
    clues.across.forEach((clue) => {
      const cells = getWordCells(grid, clueNumbers, clue.number, DIRECTION.ACROSS);

      if (cells.length === 0) {
        errors.push(`Across clue ${clue.number} has no cells`);
      } else if (cells.length === 1) {
        errors.push(`Across clue ${clue.number} is only 1 letter (minimum 2 required)`);
      }

      // Check if answer matches grid
      if (clue.answer) {
        const gridAnswer = cells.map((cell) => grid[cell.row][cell.col]).join('');
        if (gridAnswer.toUpperCase() !== clue.answer.toUpperCase()) {
          errors.push(
            `Across clue ${clue.number}: answer "${clue.answer}" doesn't match grid "${gridAnswer}"`
          );
        }
      }
    });
  }

  // Check all down clues
  if (clues.down) {
    clues.down.forEach((clue) => {
      const cells = getWordCells(grid, clueNumbers, clue.number, DIRECTION.DOWN);

      if (cells.length === 0) {
        errors.push(`Down clue ${clue.number} has no cells`);
      } else if (cells.length === 1) {
        errors.push(`Down clue ${clue.number} is only 1 letter (minimum 2 required)`);
      }

      // Check if answer matches grid
      if (clue.answer) {
        const gridAnswer = cells.map((cell) => grid[cell.row][cell.col]).join('');
        if (gridAnswer.toUpperCase() !== clue.answer.toUpperCase()) {
          errors.push(
            `Down clue ${clue.number}: answer "${clue.answer}" doesn't match grid "${gridAnswer}"`
          );
        }
      }
    });
  }

  // Check for unchecked squares (letters that appear in only one word)
  // This is a warning, not an error
  const letterCounts = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(0));

  const allClues = [
    ...(clues.across || []).map((c) => ({ ...c, direction: DIRECTION.ACROSS })),
    ...(clues.down || []).map((c) => ({ ...c, direction: DIRECTION.DOWN })),
  ];

  allClues.forEach((clue) => {
    const cells = getWordCells(grid, clueNumbers, clue.number, clue.direction);
    cells.forEach((cell) => {
      letterCounts[cell.row][cell.col]++;
    });
  });

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!isBlackSquare(grid[row][col]) && letterCounts[row][col] === 1) {
        errors.push(`Warning: Cell (${row}, ${col}) appears in only one word (unchecked square)`);
      }
    }
  }

  return {
    valid: errors.filter((e) => !e.startsWith('Warning')).length === 0,
    errors,
  };
}

/**
 * Get the first editable cell (for initializing cursor position)
 */
export function getFirstEditableCell(grid) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (isEditableCell(grid, row, col)) {
        return { row, col };
      }
    }
  }
  return { row: 0, col: 0 };
}

/**
 * Get hint: reveal one random unfilled/incorrect cell
 */
export function getHintCell(userGrid, solutionGrid) {
  const incorrectCells = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (isBlackSquare(solutionGrid[row][col])) continue;

      if (!isCellCorrect(userGrid, solutionGrid, row, col)) {
        incorrectCells.push({ row, col });
      }
    }
  }

  if (incorrectCells.length === 0) return null;

  // Return random incorrect cell
  const randomIndex = Math.floor(Math.random() * incorrectCells.length);
  return incorrectCells[randomIndex];
}

/**
 * ========================================
 * CONSTRAINT VISUALIZATION HELPERS
 * For enhanced puzzle editor UI feedback
 * ========================================
 */

/**
 * Get constraint level for a cell based on how many possibilities it has
 * Used for visual feedback in the editor
 *
 * @param {number} possibilityCount - Number of valid words/possibilities
 * @returns {string} Constraint level: 'none' | 'low' | 'medium' | 'high' | 'critical'
 */
export function getConstraintLevel(possibilityCount) {
  if (possibilityCount === 0) return 'critical'; // Red - dead end
  if (possibilityCount <= 2) return 'high'; // Orange - highly constrained
  if (possibilityCount <= 9) return 'medium'; // Yellow - moderately constrained
  if (possibilityCount >= 10) return 'low'; // Green - many possibilities
  return 'none'; // Default/unknown
}

/**
 * Get visual styling for constraint level
 * Returns Tailwind CSS classes for cell background
 *
 * @param {string} level - Constraint level from getConstraintLevel()
 * @returns {string} Tailwind CSS classes
 */
export function getConstraintLevelStyles(level) {
  const styles = {
    critical: 'bg-red-200 dark:bg-red-900 border-red-500',
    high: 'bg-orange-200 dark:bg-orange-900 border-orange-500',
    medium: 'bg-yellow-200 dark:bg-yellow-900 border-yellow-500',
    low: 'bg-green-200 dark:bg-green-900 border-green-500',
    none: 'bg-ghost-white dark:bg-gray-800',
  };

  return styles[level] || styles.none;
}

/**
 * Calculate constraint information for all cells in the grid
 * Useful for showing real-time feedback during puzzle editing
 *
 * @param {Array<Array<string>>} grid - Current grid state
 * @param {Function} getWordSuggestionsForCell - Function to get word suggestions
 * @returns {Array<Array<Object>>} Grid of constraint info: { count, level, styles }
 */
export function calculateGridConstraints(grid, getWordSuggestionsForCell) {
  const constraints = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Skip black squares
      if (isBlackSquare(grid[row][col])) {
        constraints[row][col] = {
          count: 0,
          level: 'none',
          styles: '',
        };
        continue;
      }

      // Get possibilities for both directions
      const acrossSuggestions = getWordSuggestionsForCell(grid, row, col, DIRECTION.ACROSS);
      const downSuggestions = getWordSuggestionsForCell(grid, row, col, DIRECTION.DOWN);

      // Use minimum of both directions (most constrained)
      const acrossCount = acrossSuggestions.matches?.length || 0;
      const downCount = downSuggestions.matches?.length || 0;
      const minCount = Math.min(acrossCount, downCount);

      const level = getConstraintLevel(minCount);

      constraints[row][col] = {
        count: minCount,
        acrossCount,
        downCount,
        level,
        styles: getConstraintLevelStyles(level),
      };
    }
  }

  return constraints;
}

/**
 * Get emoji indicator for constraint level
 * Useful for compact display
 *
 * @param {string} level - Constraint level
 * @returns {string} Emoji indicator
 */
export function getConstraintEmoji(level) {
  const emojis = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    none: '⚪',
  };

  return emojis[level] || '⚪';
}

/**
 * Get human-readable description of constraint level
 *
 * @param {string} level - Constraint level
 * @returns {string} Description
 */
export function getConstraintDescription(level) {
  const descriptions = {
    critical: 'No valid possibilities - dead end!',
    high: 'Highly constrained (1-2 possibilities)',
    medium: 'Moderately constrained (3-9 possibilities)',
    low: 'Many possibilities (10+)',
    none: 'Unknown or unconstrained',
  };

  return descriptions[level] || 'Unknown';
}

/**
 * ========================================
 * WORD EXTRACTION HELPERS
 * For deduplication across puzzles
 * ========================================
 */

/**
 * Extract all words from a mini puzzle solution grid
 * Used for preventing duplicate words across puzzles
 *
 * @param {Array<Array<string>>} solution - The 5x5 solution grid
 * @returns {string[]} Array of all words (uppercase) found in the grid
 */
export function extractWordsFromSolution(solution) {
  if (!solution || !Array.isArray(solution)) {
    return [];
  }

  const words = new Set();

  // Extract ACROSS words
  for (let row = 0; row < GRID_SIZE; row++) {
    let currentWord = '';
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = solution[row]?.[col];
      if (cell && !isBlackSquare(cell)) {
        currentWord += cell.toUpperCase();
      } else {
        if (currentWord.length >= 2) {
          words.add(currentWord);
        }
        currentWord = '';
      }
    }
    // Don't forget the last word in the row
    if (currentWord.length >= 2) {
      words.add(currentWord);
    }
  }

  // Extract DOWN words
  for (let col = 0; col < GRID_SIZE; col++) {
    let currentWord = '';
    for (let row = 0; row < GRID_SIZE; row++) {
      const cell = solution[row]?.[col];
      if (cell && !isBlackSquare(cell)) {
        currentWord += cell.toUpperCase();
      } else {
        if (currentWord.length >= 2) {
          words.add(currentWord);
        }
        currentWord = '';
      }
    }
    // Don't forget the last word in the column
    if (currentWord.length >= 2) {
      words.add(currentWord);
    }
  }

  return Array.from(words);
}

/**
 * Extract words from multiple mini puzzles
 * Used for building exclusion list from recent puzzles
 *
 * @param {Array<Object>} puzzles - Array of puzzle objects with solution field
 * @returns {string[]} Array of all unique words (uppercase) from all puzzles
 */
export function extractWordsFromPuzzles(puzzles) {
  if (!puzzles || !Array.isArray(puzzles)) {
    return [];
  }

  const allWords = new Set();

  for (const puzzle of puzzles) {
    if (puzzle.solution) {
      const words = extractWordsFromSolution(puzzle.solution);
      words.forEach((word) => allWords.add(word));
    }
  }

  return Array.from(allWords);
}
