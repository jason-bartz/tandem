/**
 * Daily Mini - Share Text Generator
 *
 * Generates shareable text for completed Mini crossword puzzles
 * Format: Puzzle number and time
 */

import { formatMiniTime, getMiniPuzzleInfoForDate } from './miniUtils';

/**
 * Generate share text for a completed Mini puzzle
 *
 * @param {Object} puzzle - The puzzle object
 * @param {string} puzzle.date - ISO date string
 * @param {number} puzzle.number - Puzzle number
 * @param {Object} stats - Completion stats
 * @param {number} stats.timeTaken - Time in seconds
 * @returns {string} Formatted share text (puzzle number and time)
 */
export function generateMiniShareText(puzzle, stats) {
  const { number, date } = puzzle || {};
  const { timeTaken } = stats || {};

  // Get puzzle number if not provided
  const puzzleNumber = number || getMiniPuzzleInfoForDate(date)?.number || '?';

  // Format time
  const timeStr = timeTaken ? formatMiniTime(timeTaken) : '?';

  // Build share text
  const lines = [];

  // Title line
  lines.push(`Daily Mini #${puzzleNumber}`);

  // Time line with clock emoji
  lines.push(`⏰ ${timeStr}`);

  return lines.join('\n');
}

/**
 * Generate share text with grid pattern (NYT Mini style)
 * Shows a visual representation of the solving pattern
 *
 * @param {Object} puzzle - The puzzle object
 * @param {Object} stats - Completion stats
 * @param {Array} solveOrder - Optional array of {row, col, timestamp} showing solve order
 * @returns {string} Formatted share text with grid
 */
export function generateMiniShareTextWithGrid(puzzle, stats, solveOrder = null) {
  const { number, date } = puzzle || {};
  const {
    timeTaken,
    checksUsed = 0,
    revealsUsed = 0,
    mistakes = 0,
    perfectSolve = false,
  } = stats || {};

  // Get puzzle number if not provided
  const puzzleNumber = number || getMiniPuzzleInfoForDate(date)?.number || '?';

  // Format time
  const timeStr = timeTaken ? formatMiniTime(timeTaken) : '?';

  const lines = [];

  // Title
  lines.push(`Daily Mini #${puzzleNumber}`);

  // Grid visualization (if solve order available)
  if (solveOrder && solveOrder.length > 0) {
    const grid = generateGridVisualization(solveOrder);
    lines.push(grid);
  }

  // Time and stats
  lines.push(`${timeStr} ⏱`);

  if (perfectSolve) {
    lines.push('Perfect solve!');
  } else {
    const statsParts = [];
    if (mistakes > 0) statsParts.push(`${mistakes} mistake${mistakes > 1 ? 's' : ''}`);
    if (checksUsed > 0) statsParts.push(`${checksUsed} check${checksUsed > 1 ? 's' : ''}`);
    if (revealsUsed > 0) statsParts.push(`${revealsUsed} reveal${revealsUsed > 1 ? 's' : ''}`);

    if (statsParts.length > 0) {
      lines.push(statsParts.join(' • '));
    }
  }

  lines.push('');
  lines.push('Play at tandemgame.com');

  return lines.join('\n');
}

/**
 * Generate a visual grid representation (NYT Mini style)
 * Uses emojis to show the solve pattern:
 * - ⬛ for black squares
 * - 🟩 for filled correct cells (in order)
 * - 🟨 for cells filled later
 * - ⬜ for empty cells (shouldn't happen in completed puzzle)
 *
 * @param {Array} solveOrder - Array of {row, col, timestamp}
 * @returns {string} Grid visualization
 */
function generateGridVisualization(solveOrder) {
  const GRID_SIZE = 5;
  const grid = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill('⬜'));

  // Mark black squares (if provided in solve order data)
  solveOrder.forEach((cell) => {
    if (cell.isBlack) {
      grid[cell.row][cell.col] = '⬛';
    }
  });

  // Sort by timestamp to get solve order
  const sortedCells = solveOrder
    .filter((cell) => !cell.isBlack)
    .sort((a, b) => a.timestamp - b.timestamp);

  // First half gets green (earlier solves)
  // Second half gets yellow (later solves)
  const midpoint = Math.floor(sortedCells.length / 2);

  sortedCells.forEach((cell, index) => {
    if (index < midpoint) {
      grid[cell.row][cell.col] = '🟩'; // Green for early solves
    } else {
      grid[cell.row][cell.col] = '🟨'; // Yellow for later solves
    }
  });

  // Convert to string
  const gridLines = grid.map((row) => row.join('')).join('\n');

  return gridLines;
}

/**
 * Generate simple stats summary (for copy/paste)
 *
 * @param {Object} stats - User stats object
 * @returns {string} Stats summary
 */
export function generateMiniStatsSummary(stats) {
  const {
    totalCompleted = 0,
    currentStreak = 0,
    longestStreak = 0,
    averageTime = 0,
    bestTime = 0,
    perfectSolves = 0,
  } = stats;

  const lines = [];

  lines.push('Daily Mini Stats');
  lines.push('───────────────');
  lines.push(`Puzzles: ${totalCompleted}`);
  lines.push(`Streak: ${currentStreak} (best: ${longestStreak})`);

  if (bestTime > 0) {
    lines.push(`Best time: ${formatMiniTime(bestTime)}`);
  }

  if (averageTime > 0) {
    lines.push(`Avg time: ${formatMiniTime(averageTime)}`);
  }

  if (perfectSolves > 0) {
    lines.push(`Perfect solves: ${perfectSolves}`);
  }

  lines.push('');
  lines.push('Play at tandemgame.com');

  return lines.join('\n');
}

/**
 * Generate streak announcement text
 * Used for celebrating milestones
 *
 * @param {number} streak - Current streak count
 * @returns {string} Announcement text
 */
export function generateStreakAnnouncement(streak) {
  if (streak === 0) return null;

  const milestones = [7, 14, 30, 50, 100, 365];
  const isMilestone = milestones.includes(streak);

  if (!isMilestone && streak < 7) return null;

  const lines = [];

  if (isMilestone) {
    lines.push(`${streak}-day streak!`);
    if (streak === 7) lines.push('One week straight!');
    else if (streak === 14) lines.push('Two weeks!');
    else if (streak === 30) lines.push('One month!');
    else if (streak === 50) lines.push('Fifty days!');
    else if (streak === 100) lines.push('One hundred days!');
    else if (streak === 365) lines.push('One full year!');
  } else {
    lines.push(`${streak}-day streak`);
  }

  lines.push('');
  lines.push('Daily Mini');
  lines.push('tandemgame.com');

  return lines.join('\n');
}

/**
 * Get share text for specific format (plain vs with grid)
 *
 * @param {Object} puzzle - Puzzle data
 * @param {Object} stats - Completion stats
 * @param {string} format - 'plain' or 'grid'
 * @param {Array} solveOrder - Optional solve order data
 * @returns {string} Share text
 */
export function getMiniShareText(puzzle, stats, format = 'plain', solveOrder = null) {
  if (format === 'grid' && solveOrder) {
    return generateMiniShareTextWithGrid(puzzle, stats, solveOrder);
  }

  return generateMiniShareText(puzzle, stats);
}

/**
 * Format share data for clipboard
 * Includes both plain text and structured data
 *
 * @param {Object} puzzle - Puzzle data
 * @param {Object} stats - Completion stats
 * @returns {Object} Share data with text and structured data
 */
export function formatMiniShareData(puzzle, stats) {
  const text = generateMiniShareText(puzzle, stats);

  return {
    text,
    structuredData: {
      game: 'Daily Mini',
      puzzleNumber: puzzle.number,
      date: puzzle.date,
      timeTaken: stats.timeTaken,
      perfectSolve: stats.perfectSolve || false,
      checksUsed: stats.checksUsed || 0,
      revealsUsed: stats.revealsUsed || 0,
      mistakes: stats.mistakes || 0,
    },
  };
}

/**
 * Validate share text format
 * Useful for testing
 *
 * @param {string} shareText - Share text to validate
 * @returns {boolean} Whether the share text is valid
 */
export function validateShareText(shareText) {
  if (!shareText || typeof shareText !== 'string') return false;

  // Check for required elements
  const hasTitle = shareText.includes('Daily Mini #');
  const hasTime = shareText.includes('⏰');

  return hasTitle && hasTime;
}

export default {
  generateMiniShareText,
  generateMiniShareTextWithGrid,
  generateMiniStatsSummary,
  generateStreakAnnouncement,
  getMiniShareText,
  formatMiniShareData,
  validateShareText,
};
