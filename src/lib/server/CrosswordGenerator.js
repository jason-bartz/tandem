/**
 * Enhanced Crossword Puzzle Generator
 *
 * Implements two-level heuristic constraint satisfaction algorithm:
 * - Level 1 (Slot Selection): Most Constrained Variable (MCV) - select slot with fewest possibilities
 * - Level 2 (Word Selection): Least Constraining Value (LCV) - select word that maximizes remaining possibilities
 *
 * Based on research from bakitybacon/minicrossword with significant enhancements:
 * - Pattern caching for performance
 * - Word frequency filtering for difficulty control
 * - Forward checking for early pruning
 * - Explicit move stack for efficient backtracking
 * - Real-time progress tracking
 */

// import { Trie } from './TrieGenerator.js';
import logger from '@/lib/logger';

const BLACK_SQUARE = '■';
const EMPTY_CELL = '';

export default class CrosswordGenerator {
  constructor(trie, options = {}) {
    this.trie = trie;
    this.grid = Array(5)
      .fill(null)
      .map(() => Array(5).fill(EMPTY_CELL));
    this.solution = Array(5)
      .fill(null)
      .map(() => Array(5).fill(EMPTY_CELL));
    this.wordSlots = []; // All detected word slots
    this.placedWords = []; // {word, direction, startRow, startCol}
    this.moveStack = []; // Stack for backtracking
    this.maxRetries = options.maxRetries || 100;
    this.minFrequency = options.minFrequency || 0; // Word frequency threshold (0-100)
    this.excludeWords = new Set((options.excludeWords || []).map((w) => w.toUpperCase())); // Words to exclude (from recent puzzles)
    this.complete = false;

    // Progress tracking
    this.generationStats = {
      totalAttempts: 0,
      backtrackCount: 0,
      slotsFilled: 0,
      startTime: null,
      patternSearches: 0,
      flexibilityCalculations: 0,
      excludedWordsCount: this.excludeWords.size,
    };
  }

  /**
   * Generate a crossword puzzle
   * @param {string} mode - 'scratch' or 'fill'
   * @param {Array} existingGrid - Optional existing grid with black squares
   * @param {string} symmetry - Optional symmetry type
   * @returns {object} {success, grid, solution, words, stats}
   */
  generate(mode = 'scratch', existingGrid = null, symmetry = 'none') {
    let attempts = 0;
    let success = false;
    this.generationStats.startTime = Date.now();

    while (!success && attempts < this.maxRetries) {
      attempts++;
      this.generationStats.totalAttempts = attempts;

      try {
        if (mode === 'scratch') {
          this.generateFromScratch(symmetry);
        } else {
          this.fillExistingPattern(existingGrid);
        }

        success = this.complete;
      } catch (error) {
        logger.debug(`Attempt ${attempts} failed:`, error.message);
        this.reset();
      }
    }

    if (!success) {
      throw new Error(`Failed to generate puzzle after ${this.maxRetries} attempts`);
    }

    const elapsedTime = Date.now() - this.generationStats.startTime;
    logger.info(`Successfully generated puzzle in ${attempts} attempt(s) (${elapsedTime}ms)`);
    logger.debug(`Cache stats:`, this.trie.getStats().cacheStats);

    return {
      success: true,
      grid: this.getGridWithBlackSquares(),
      solution: this.solution,
      words: this.placedWords,
      stats: {
        ...this.generationStats,
        elapsedTime,
        cacheHitRate: this.trie.getCacheHitRate(),
        cacheSize: this.trie.patternCache.size,
      },
    };
  }

  /**
   * Reset generator state for new attempt
   */
  reset() {
    this.grid = Array(5)
      .fill(null)
      .map(() => Array(5).fill(EMPTY_CELL));
    this.solution = Array(5)
      .fill(null)
      .map(() => Array(5).fill(EMPTY_CELL));
    this.wordSlots = [];
    this.placedWords = [];
    this.moveStack = [];
    this.complete = false;
    this.generationStats.slotsFilled = 0;
    this.generationStats.backtrackCount = 0;
  }

  /**
   * Generate puzzle from scratch with black square pattern
   */
  generateFromScratch(symmetry) {
    // Create black square pattern
    this.createBlackSquarePattern(symmetry);

    // Detect word slots
    this.detectWordSlots();

    // Fill the puzzle using enhanced algorithm
    this.fillPuzzleWithHeuristics();
  }

  /**
   * Fill existing pattern (smart autofill mode)
   */
  fillExistingPattern(existingGrid) {
    if (!existingGrid) {
      throw new Error('Existing grid required for fill mode');
    }

    // Copy existing grid (preserving black squares and any letters)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        this.grid[row][col] = existingGrid[row][col] || EMPTY_CELL;
      }
    }

    // Detect word slots
    this.detectWordSlots();

    // Fill the puzzle using enhanced algorithm
    this.fillPuzzleWithHeuristics();
  }

  /**
   * High-quality pattern templates for 5x5 crosswords
   * Each pattern is designed for good word lengths and connectivity
   */
  getQualityPatterns() {
    return [
      // Pattern 1: Corner blacks (2-4 blacks, good for longer words)
      [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 2: Diagonal (2 blacks, creates 3-4 letter words)
      [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 3: Center cross (minimal blacks, longer words)
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 4: L-shape (2-3 blacks, varied word lengths)
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 5: Alternating (3-4 blacks, balanced)
      [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 6: Minimal (1-2 blacks only)
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
    ];
  }

  /**
   * Apply symmetry to a pattern
   */
  applySymmetryToPattern(pattern, symmetry) {
    const newPattern = pattern.map((row) => [...row]);

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (pattern[row][col] === 1) {
          // Apply symmetry
          if (symmetry === 'rotational') {
            const symRow = 4 - row;
            const symCol = 4 - col;
            newPattern[symRow][symCol] = 1;
          } else if (symmetry === 'horizontal') {
            const symRow = 4 - row;
            newPattern[symRow][col] = 1;
          } else if (symmetry === 'vertical') {
            const symCol = 4 - col;
            newPattern[row][symCol] = 1;
          } else if (symmetry === 'diagonal-ne-sw') {
            const symRow = 4 - col;
            const symCol = 4 - row;
            if (symRow >= 0 && symRow < 5 && symCol >= 0 && symCol < 5) {
              newPattern[symRow][symCol] = 1;
            }
          } else if (symmetry === 'diagonal-nw-se') {
            newPattern[col][row] = 1;
          }
        }
      }
    }

    return newPattern;
  }

  /**
   * Create black square pattern with optional symmetry
   * Now uses quality templates instead of random placement
   */
  createBlackSquarePattern(symmetry) {
    const patterns = this.getQualityPatterns();

    // Select a random high-quality pattern
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

    // Apply symmetry
    const finalPattern = this.applySymmetryToPattern(selectedPattern, symmetry);

    // Apply pattern to grid
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (finalPattern[row][col] === 1) {
          this.grid[row][col] = BLACK_SQUARE;
        }
      }
    }

    // Validate pattern quality
    if (!this.isPatternValid()) {
      logger.debug('[Generator] Pattern quality check failed, using minimal pattern');
      // Fallback to minimal pattern (center black only)
      this.grid = Array(5)
        .fill(null)
        .map(() => Array(5).fill(EMPTY_CELL));
      this.grid[2][2] = BLACK_SQUARE;
    }
  }

  /**
   * Validate that a pattern meets quality standards
   */
  isPatternValid() {
    // Count black squares
    let blackCount = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (this.grid[row][col] === BLACK_SQUARE) {
          blackCount++;
        }
      }
    }

    // Reject if too many blacks (more than 40% of grid)
    if (blackCount > 10) {
      logger.debug(`[Quality] Too many black squares: ${blackCount}`);
      return false;
    }

    // Check for entire rows or columns of blacks
    for (let row = 0; row < 5; row++) {
      if (this.grid[row].every((cell) => cell === BLACK_SQUARE)) {
        logger.debug(`[Quality] Entire row ${row} is black`);
        return false;
      }
    }

    for (let col = 0; col < 5; col++) {
      if (this.grid.every((row) => row[col] === BLACK_SQUARE)) {
        logger.debug(`[Quality] Entire column ${col} is black`);
        return false;
      }
    }

    // Check connectivity (no sections isolated by blacks)
    if (!this.isGridConnected()) {
      logger.debug('[Quality] Grid not fully connected');
      return false;
    }

    return true;
  }

  /**
   * Check if all white squares are connected (flood fill)
   */
  isGridConnected() {
    const visited = Array(5)
      .fill(null)
      .map(() => Array(5).fill(false));
    let whiteSquares = 0;
    let startRow = -1,
      startCol = -1;

    // Count white squares and find starting position
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (this.grid[row][col] !== BLACK_SQUARE) {
          whiteSquares++;
          if (startRow === -1) {
            startRow = row;
            startCol = col;
          }
        }
      }
    }

    if (whiteSquares === 0) return false;

    // Flood fill from starting position
    const stack = [[startRow, startCol]];
    let visitedCount = 0;

    while (stack.length > 0) {
      const [row, col] = stack.pop();

      if (row < 0 || row >= 5 || col < 0 || col >= 5) continue;
      if (visited[row][col]) continue;
      if (this.grid[row][col] === BLACK_SQUARE) continue;

      visited[row][col] = true;
      visitedCount++;

      // Add neighbors
      stack.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
    }

    return visitedCount === whiteSquares;
  }

  /**
   * Remove cells that can't form valid words (length < 3 preferred)
   */
  removeIsolatedCells() {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (this.grid[row][col] !== BLACK_SQUARE) {
          const hasAcross = this.getWordLength(row, col, 'across') >= 2;
          const hasDown = this.getWordLength(row, col, 'down') >= 2;

          if (!hasAcross && !hasDown) {
            this.grid[row][col] = BLACK_SQUARE;
          }
        }
      }
    }
  }

  /**
   * Get word length from a starting position
   */
  getWordLength(row, col, direction) {
    let length = 0;

    if (direction === 'across') {
      for (let c = col; c < 5 && this.grid[row][c] !== BLACK_SQUARE; c++) {
        length++;
      }
    } else {
      for (let r = row; r < 5 && this.grid[r][col] !== BLACK_SQUARE; r++) {
        length++;
      }
    }

    return length;
  }

  /**
   * Detect all word slots in the grid
   */
  detectWordSlots() {
    this.wordSlots = [];

    // Detect across slots
    for (let row = 0; row < 5; row++) {
      let col = 0;
      while (col < 5) {
        if (this.grid[row][col] !== BLACK_SQUARE) {
          const length = this.getWordLength(row, col, 'across');

          if (length >= 2) {
            const pattern = this.getPattern(row, col, 'across', length);
            this.wordSlots.push({
              id: `across-${row}-${col}`,
              direction: 'across',
              startRow: row,
              startCol: col,
              length,
              pattern,
              filled: false,
            });
          }

          col += length;
        } else {
          col++;
        }
      }
    }

    // Detect down slots
    for (let col = 0; col < 5; col++) {
      let row = 0;
      while (row < 5) {
        if (this.grid[row][col] !== BLACK_SQUARE) {
          const length = this.getWordLength(row, col, 'down');

          if (length >= 2) {
            const pattern = this.getPattern(row, col, 'down', length);
            this.wordSlots.push({
              id: `down-${row}-${col}`,
              direction: 'down',
              startRow: row,
              startCol: col,
              length,
              pattern,
              filled: false,
            });
          }

          row += length;
        } else {
          row++;
        }
      }
    }

    logger.debug(`Detected ${this.wordSlots.length} word slots`);
  }

  /**
   * Get current pattern for a word slot
   */
  getPattern(row, col, direction, length) {
    let pattern = '';

    for (let i = 0; i < length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      const cell = this.grid[r][c];

      pattern += cell && cell !== BLACK_SQUARE && cell !== EMPTY_CELL ? cell : '.';
    }

    return pattern;
  }

  /**
   * Calculate quality score for a completed puzzle
   * Higher score = better quality
   */
  calculatePuzzleQuality() {
    let score = 100;

    // Count word lengths
    const wordLengths = this.placedWords.map((w) => w.word.length);
    const twoLetterWords = wordLengths.filter((len) => len === 2).length;
    const threeLetterWords = wordLengths.filter((len) => len === 3).length;
    const fourPlusWords = wordLengths.filter((len) => len >= 4).length;

    // Heavy penalty for 2-letter words
    score -= twoLetterWords * 30;

    // Bonus for 3+ letter words
    score += threeLetterWords * 10;
    score += fourPlusWords * 20;

    // Count black squares
    let blackCount = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (this.grid[row][col] === BLACK_SQUARE) {
          blackCount++;
        }
      }
    }

    // Penalty for too many blacks
    if (blackCount > 6) {
      score -= (blackCount - 6) * 10;
    }

    // Bonus for having enough words
    score += this.placedWords.length * 5;

    return {
      score,
      twoLetterWords,
      threeLetterWords,
      fourPlusWords,
      blackCount,
      totalWords: this.placedWords.length,
    };
  }

  /**
   * Fill the puzzle using two-level heuristic algorithm
   *
   * Algorithm:
   * 1. Select most constrained slot (MCV - fewest possibilities)
   * 2. For that slot, evaluate each candidate word by tentatively placing it
   * 3. Calculate total remaining possibilities across ALL unfilled slots
   * 4. Sort words by flexibility (most-to-least remaining possibilities)
   * 5. Try words in that order (most flexible first = LCV)
   * 6. Backtrack if no solution found
   */
  fillPuzzleWithHeuristics() {
    const success = this.backtrackWithHeuristics();

    if (!success) {
      throw new Error('Could not fill puzzle');
    }

    // Calculate quality score
    const quality = this.calculatePuzzleQuality();
    logger.debug('[Generator] Puzzle quality:', quality);

    // Reject low-quality puzzles (too many 2-letter words)
    // Relaxed thresholds to allow generation while still maintaining quality
    const MIN_QUALITY_SCORE = -50; // Threshold (very lenient)
    const MAX_TWO_LETTER_WORDS = 6; // Allow up to 6 two-letter words
    if (quality.score < MIN_QUALITY_SCORE || quality.twoLetterWords > MAX_TWO_LETTER_WORDS) {
      throw new Error(
        `Puzzle quality too low (score: ${quality.score}, 2-letter words: ${quality.twoLetterWords})`
      );
    }

    // Copy grid to solution
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        this.solution[row][col] = this.grid[row][col];
      }
    }

    this.generationStats.qualityScore = quality.score;
    this.generationStats.twoLetterWords = quality.twoLetterWords;
    this.generationStats.threeLetterWords = quality.threeLetterWords;
    this.generationStats.fourPlusWords = quality.fourPlusWords;

    this.complete = true;
  }

  /**
   * Enhanced backtracking with two-level heuristics
   */
  backtrackWithHeuristics() {
    // Base case: all slots filled
    if (this.placedWords.length >= this.wordSlots.length) {
      return true;
    }

    // Level 1: Select most constrained slot (MCV)
    const slot = this.selectMostConstrainedSlot();

    if (!slot) {
      return false; // No unfilled slots (shouldn't happen)
    }

    // Update pattern based on current grid state
    slot.pattern = this.getPattern(slot.startRow, slot.startCol, slot.direction, slot.length);

    // Forward checking: ensure slot has at least one possibility
    if (!this.canBeCompleted(slot)) {
      return false; // Dead end - backtrack early
    }

    // Get candidate words with frequency filtering
    const candidates = this.getCandidateWordsWithFrequency(slot);

    if (candidates.length === 0) {
      return false; // No valid words for this slot
    }

    // Level 2: Order words by flexibility (LCV - least constraining first)
    const orderedCandidates = this.orderWordsByFlexibility(slot, candidates);

    // Try each candidate in order
    for (const { word } of orderedCandidates) {
      // Place word
      if (this.placeWord(word, slot)) {
        this.generationStats.slotsFilled++;

        // Recursively fill next slot
        if (this.backtrackWithHeuristics()) {
          return true;
        }

        // Backtrack: remove word
        this.removeWord(slot);
        this.generationStats.backtrackCount++;
        this.generationStats.slotsFilled--;
      }
    }

    return false;
  }

  /**
   * Select most constrained slot (MCV heuristic)
   * Returns the unfilled slot with the FEWEST valid word possibilities
   */
  selectMostConstrainedSlot() {
    let mostConstrainedSlot = null;
    let minPossibilities = Infinity;

    for (const slot of this.wordSlots) {
      if (slot.filled) continue;

      // Update pattern
      slot.pattern = this.getPattern(slot.startRow, slot.startCol, slot.direction, slot.length);

      // Count possibilities
      const possibilities = this.trie.searchByPatternWithFrequency(slot.pattern, this.minFrequency);
      const availableCount = possibilities.filter((w) => !this.isWordUsed(w)).length;

      // Select slot with minimum possibilities
      if (availableCount < minPossibilities) {
        minPossibilities = availableCount;
        mostConstrainedSlot = slot;
      }
    }

    return mostConstrainedSlot;
  }

  /**
   * Order words by flexibility (LCV heuristic) with word length preference
   * For each candidate word, calculate how many total possibilities remain after placing it
   * Return words sorted by flexibility (MOST to LEAST remaining possibilities)
   * BONUS: Prefer longer words (3+ letters) for better puzzle quality
   */
  orderWordsByFlexibility(slot, candidates) {
    this.generationStats.flexibilityCalculations += candidates.length;

    const scoredWords = candidates.map((word) => {
      // Tentatively place the word
      const saveState = this.saveGridState();
      this.placeWordTemporary(word, slot);

      // Calculate total remaining possibilities across ALL unfilled slots
      const totalPossibilities = this.calculateTotalPossibilities();

      // Restore grid state
      this.restoreGridState(saveState);

      // Calculate adjusted score (flexibility + word length bonus)
      let adjustedScore = totalPossibilities;

      // Moderate preference for longer words (not too aggressive)
      if (word.length >= 5) {
        adjustedScore += 30; // Bonus for 5-letter words
      } else if (word.length === 4) {
        adjustedScore += 20; // Bonus for 4-letter words
      } else if (word.length === 3) {
        adjustedScore += 10; // Small bonus for 3-letter words
      }
      // 2-letter words: no bonus, but not penalized

      return {
        word,
        flexibility: totalPossibilities,
        adjustedScore,
      };
    });

    // Sort by adjusted score (descending - highest score first)
    scoredWords.sort((a, b) => b.adjustedScore - a.adjustedScore);

    return scoredWords;
  }

  /**
   * Calculate total possibilities remaining across all unfilled slots
   * This is the core of the "maximize possibilities remaining" algorithm
   */
  calculateTotalPossibilities() {
    let total = 0;

    for (const slot of this.wordSlots) {
      if (slot.filled) continue;

      // Update pattern
      const pattern = this.getPattern(slot.startRow, slot.startCol, slot.direction, slot.length);

      // Get possibilities
      const possibilities = this.trie.searchByPatternWithFrequency(pattern, this.minFrequency);
      const availableCount = possibilities.filter((w) => !this.isWordUsed(w)).length;

      total += availableCount;
    }

    return total;
  }

  /**
   * Forward checking: can this slot be completed?
   * Returns false if slot has zero valid possibilities (early pruning)
   */
  canBeCompleted(slot) {
    const possibilities = this.trie.searchByPatternWithFrequency(slot.pattern, this.minFrequency);
    const availableCount = possibilities.filter((w) => !this.isWordUsed(w)).length;

    return availableCount > 0;
  }

  /**
   * Get candidate words for a slot with frequency filtering
   */
  getCandidateWordsWithFrequency(slot) {
    this.generationStats.patternSearches++;

    const matches = this.trie.searchByPatternWithFrequency(slot.pattern, this.minFrequency);

    if (matches.length === 0) {
      return [];
    }

    // Filter out already-used words (avoid duplicates)
    const available = matches.filter((w) => !this.isWordUsed(w));

    return available;
  }

  /**
   * Check if word is already used (in this puzzle OR in recent puzzles)
   */
  isWordUsed(word) {
    const upperWord = word.toUpperCase();
    // Check if used in current puzzle
    if (this.placedWords.some((pw) => pw.word === upperWord)) {
      return true;
    }
    // Check if in exclusion list (from recent puzzles)
    if (this.excludeWords.has(upperWord)) {
      return true;
    }
    return false;
  }

  /**
   * Place a word in the grid
   */
  placeWord(word, slot) {
    const { direction, startRow, startCol, length } = slot;

    if (word.length !== length) {
      return false;
    }

    // Check if word can be placed
    for (let i = 0; i < length; i++) {
      const row = direction === 'across' ? startRow : startRow + i;
      const col = direction === 'across' ? startCol + i : startCol;
      const currentCell = this.grid[row][col];

      if (currentCell && currentCell !== EMPTY_CELL && currentCell !== word[i]) {
        return false; // Conflict
      }
    }

    // Save previous state to move stack
    const previousState = this.saveSlotState(slot);
    this.moveStack.push({ slot, previousState });

    // Place word
    for (let i = 0; i < length; i++) {
      const row = direction === 'across' ? startRow : startRow + i;
      const col = direction === 'across' ? startCol + i : startCol;
      this.grid[row][col] = word[i];
    }

    // Track placed word
    this.placedWords.push({
      word,
      direction,
      startRow,
      startCol,
    });

    slot.filled = true;

    return true;
  }

  /**
   * Place word temporarily (for flexibility calculation only)
   */
  placeWordTemporary(word, slot) {
    const { direction, startRow, startCol, length } = slot;

    for (let i = 0; i < length; i++) {
      const row = direction === 'across' ? startRow : startRow + i;
      const col = direction === 'across' ? startCol + i : startCol;
      this.grid[row][col] = word[i];
    }

    slot.filled = true;
  }

  /**
   * Remove a word from the grid (backtracking)
   */
  removeWord(slot) {
    // Remove from placed words
    this.placedWords = this.placedWords.filter(
      (pw) =>
        !(
          pw.direction === slot.direction &&
          pw.startRow === slot.startRow &&
          pw.startCol === slot.startCol
        )
    );

    // Pop from move stack and restore state
    if (this.moveStack.length > 0) {
      const { previousState } = this.moveStack.pop();
      this.restoreSlotState(slot, previousState);
    }

    slot.filled = false;
  }

  /**
   * Save slot state for backtracking
   */
  saveSlotState(slot) {
    const { direction, startRow, startCol, length } = slot;
    const cells = [];

    for (let i = 0; i < length; i++) {
      const row = direction === 'across' ? startRow : startRow + i;
      const col = direction === 'across' ? startCol + i : startCol;
      cells.push(this.grid[row][col]);
    }

    return cells;
  }

  /**
   * Restore slot state
   */
  restoreSlotState(slot, previousState) {
    const { direction, startRow, startCol, length } = slot;

    for (let i = 0; i < length; i++) {
      const row = direction === 'across' ? startRow : startRow + i;
      const col = direction === 'across' ? startCol + i : startCol;

      // Only restore if not part of another word
      const isPartOfOtherWord = this.placedWords.some((pw) => {
        if (
          pw.direction === slot.direction &&
          pw.startRow === slot.startRow &&
          pw.startCol === slot.startCol
        ) {
          return false; // Skip current slot
        }
        if (pw.direction === 'across') {
          return pw.startRow === row && pw.startCol <= col && col < pw.startCol + pw.word.length;
        } else {
          return pw.startCol === col && pw.startRow <= row && row < pw.startRow + pw.word.length;
        }
      });

      if (!isPartOfOtherWord) {
        this.grid[row][col] = previousState[i];
      }
    }
  }

  /**
   * Save complete grid state
   */
  saveGridState() {
    return this.grid.map((row) => [...row]);
  }

  /**
   * Restore complete grid state
   */
  restoreGridState(savedState) {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        this.grid[row][col] = savedState[row][col];
      }
    }
  }

  /**
   * Get grid with black squares (for display)
   */
  getGridWithBlackSquares() {
    return this.grid.map((row) =>
      row.map((cell) => (cell === BLACK_SQUARE ? BLACK_SQUARE : EMPTY_CELL))
    );
  }
}
