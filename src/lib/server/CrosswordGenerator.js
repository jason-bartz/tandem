/**
 * Crossword Puzzle Generator — CSP Solver with Scored Word Dictionary
 *
 * Inspired by CrossFire by Beekeeper Labs. Uses constraint satisfaction
 * with AC-3 propagation, MRV slot selection, and backtracking search
 * against a scored word dictionary (WordIndex).
 *
 * Key features:
 * - Position-letter index for near-instant candidate lookup
 * - AC-3 arc consistency for constraint propagation
 * - MRV (Minimum Remaining Values) heuristic for slot selection
 * - Word-score-weighted candidate ordering
 * - Grid Score and Final Score (CrossFire-style)
 * - Quick Fill with randomness for varied results
 * - Seed word support for themed puzzles
 * - Candidate list generation for interactive UI
 */

import logger from '@/lib/logger';

const BLACK_SQUARE = '■';
const EMPTY_CELL = '';
const GRID_SIZE = 5;

export default class CrosswordGenerator {
  /**
   * @param {import('./WordIndex').default} wordIndex - WordIndex instance (loaded)
   * @param {object} options
   * @param {number} [options.maxRetries=50] - Max full attempts for generate()
   * @param {number} [options.minScore=5] - Minimum word score threshold (1-100)
   * @param {string[]} [options.excludeWords=[]] - Words to exclude (recent puzzles)
   * @param {number} [options.timeoutMs=10000] - Max time per solve attempt
   * @param {number} [options.minFrequency] - Alias for minScore (backward compat)
   */
  constructor(wordIndex, options = {}) {
    this.wordIndex = wordIndex;
    this.minScore = options.minScore || options.minFrequency || 5;
    this.maxRetries = options.maxRetries || 50;
    this.timeoutMs = options.timeoutMs || 10000;
    this.excludeWords = new Set((options.excludeWords || []).map((w) => w.toUpperCase()));

    // Randomize mode: when true, _backtrack uses pre-shuffled domain order
    this._randomize = false;

    // Internal state — reset per attempt
    this.grid = this._emptyGrid();
    this.solution = this._emptyGrid();
    this.slots = [];
    this.placedWords = [];
    this.complete = false;

    // Crossing map: built once after detectSlots, maps slotId → [{crossSlot, posInThis, posInCross}]
    this.crossings = new Map();

    // Stats
    this.stats = {
      totalAttempts: 0,
      backtrackCount: 0,
      slotsFilled: 0,
      patternSearches: 0,
      startTime: null,
      excludedWordsCount: this.excludeWords.size,
    };
  }

  // ─── Public API ───────────────────────────────────────────────────

  /**
   * Generate a complete crossword puzzle.
   * Backward-compatible with old API: generate(mode, existingGrid, symmetry)
   *
   * @param {string} mode - 'scratch' or 'fill'
   * @param {string[][]|null} existingGrid - Grid with letters/blacks for 'fill' mode
   * @param {string} symmetry - 'none'|'rotational'|'horizontal'|'vertical'
   * @returns {{ success, grid, solution, words, stats }}
   */
  generate(mode = 'scratch', existingGrid = null, symmetry = 'none') {
    this.stats.startTime = Date.now();
    let attempts = 0;
    let success = false;

    while (!success && attempts < this.maxRetries) {
      attempts++;
      this.stats.totalAttempts = attempts;

      try {
        this._reset();

        if (mode === 'fill' && existingGrid) {
          this._loadGrid(existingGrid);
        } else {
          this._applyRandomPattern(symmetry);
        }

        this._detectSlots();
        this._buildCrossingMap();
        this._initDomains();

        // Initial AC-3 propagation
        if (!this._ac3Full()) {
          throw new Error('Initial AC-3 found unsolvable grid pattern');
        }

        // Solve with backtracking
        const solved = this._solve();
        if (!solved) {
          throw new Error('Backtracking exhausted without solution');
        }

        // Quality check (0-100 scale)
        const quality = this._calculateQuality();
        if (quality.score < 30 || quality.twoLetterWords > 4) {
          throw new Error(
            `Quality too low: score=${quality.score}, 2-letter=${quality.twoLetterWords}`
          );
        }

        // Copy solution
        this.solution = this.grid.map((row) => [...row]);
        this.stats.qualityScore = quality.score;
        this.stats.twoLetterWords = quality.twoLetterWords;
        this.stats.threeLetterWords = quality.threeLetterWords;
        this.stats.fourPlusWords = quality.fourPlusWords;
        this.stats.averageWordScore = quality.averageWordScore;
        this.complete = true;
        success = true;
      } catch (err) {
        logger.debug(`[Generator] Attempt ${attempts} failed: ${err.message}`);
      }
    }

    if (!success) {
      throw new Error(`Failed to generate puzzle after ${this.maxRetries} attempts`);
    }

    const elapsedTime = Date.now() - this.stats.startTime;
    logger.info(
      `[Generator] Success in ${attempts} attempt(s), ${elapsedTime}ms, ` +
        `${this.stats.backtrackCount} backtracks`
    );

    return {
      success: true,
      grid: this._getBlackSquareGrid(),
      solution: this.solution,
      words: this.placedWords.map((pw) => ({
        word: pw.word,
        direction: pw.direction,
        startRow: pw.startRow,
        startCol: pw.startCol,
      })),
      stats: {
        ...this.stats,
        elapsedTime,
        // Backward-compat fields
        flexibilityCalculations: 0,
        cacheHitRate: 0,
        cacheSize: 0,
      },
    };
  }

  /**
   * Quick Fill: fill the current grid state with randomness.
   * Each call produces a different valid fill.
   *
   * @param {string[][]} currentGrid - Current grid state
   * @param {object} [options]
   * @param {number} [options.minScore] - Override min score
   * @param {string[]} [options.excludeWords] - Additional exclusions
   * @returns {{ success, solution, words, qualityScore, averageWordScore, elapsedMs }}
   */
  quickFill(currentGrid, options = {}) {
    const startTime = Date.now();
    this.stats.startTime = startTime;
    const maxAttempts = options.attempts || 5;
    const earlyExitScore = 70;

    // Apply options once before the loop
    if (options.minScore !== undefined) this.minScore = options.minScore;
    if (options.excludeWords) {
      for (const w of options.excludeWords) this.excludeWords.add(w.toUpperCase());
    }

    // Enable randomized backtracking
    this._randomize = true;

    let bestResult = null;
    let bestAvgScore = -1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this._reset();
      this._loadGrid(currentGrid);
      this._detectSlots();
      this._buildCrossingMap();
      this._initDomains();

      if (!this._ac3Full()) {
        // Grid is unsolvable — no point retrying
        this._randomize = false;
        return { success: false, error: 'No valid fill exists for this grid' };
      }

      // Shuffle domains for randomness (each attempt gets different order)
      for (const slot of this.slots) {
        if (!slot.filled) {
          slot.domain = this._shuffleWithScoreBias(slot.domain);
        }
      }

      const solved = this._solve();
      if (!solved) continue;

      const quality = this._calculateQuality();

      if (quality.averageWordScore > bestAvgScore) {
        bestAvgScore = quality.averageWordScore;
        bestResult = {
          success: true,
          solution: this.grid.map((row) => [...row]),
          words: this.placedWords.map((pw) => ({
            word: pw.word,
            direction: pw.direction,
            startRow: pw.startRow,
            startCol: pw.startCol,
          })),
          qualityScore: quality.score,
          averageWordScore: quality.averageWordScore,
          elapsedMs: Date.now() - startTime,
        };

        // Early exit if quality is already great
        if (bestAvgScore >= earlyExitScore) break;
      }
    }

    this._randomize = false;

    if (!bestResult) {
      return { success: false, error: 'Could not complete fill' };
    }

    bestResult.elapsedMs = Date.now() - startTime;
    return bestResult;
  }

  /**
   * Evaluate a filled grid and return quality metrics.
   * Loads the grid, detects words, and calculates quality without solving.
   *
   * @param {string[][]} currentGrid - Grid with letters (and optional black squares)
   * @returns {{ success: boolean, quality: object }}
   */
  evaluateGrid(currentGrid) {
    this._reset();
    this._loadGrid(currentGrid);
    this._detectSlots();

    // Build placedWords from the filled slots
    this.placedWords = [];
    for (const slot of this.slots) {
      let word = '';
      let complete = true;
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === 'across' ? slot.startRow : slot.startRow + i;
        const c = slot.direction === 'across' ? slot.startCol + i : slot.startCol;
        const letter = this.grid[r][c];
        if (!letter || letter === '' || letter === '.') {
          complete = false;
          break;
        }
        word += letter;
      }
      if (complete && word.length >= 2) {
        this.placedWords.push({
          word,
          direction: slot.direction,
          startRow: slot.startRow,
          startCol: slot.startCol,
        });
      }
    }

    const quality = this._calculateQuality();
    return { success: true, quality };
  }

  /**
   * Get scored candidates for a specific slot (for interactive UI).
   * Returns ALL viable candidates with word scores. Grid scores are computed
   * for all candidates (or top N for very large domains to stay responsive).
   *
   * @param {string[][]} currentGrid - Current grid state
   * @param {string} slotId - e.g. "across-0-0"
   * @param {object} [options]
   * @param {boolean} [options.computeGridScore=true] - Whether to compute grid scores
   * @returns {{ candidates: Array<{word, wordScore, gridScore, viable}>, slot, totalCandidates }}
   */
  getCandidatesForSlot(currentGrid, slotId, options = {}) {
    const computeGridScore = options.computeGridScore !== false;
    const gridScoreLimit = 2000; // compute grid scores for up to this many

    this._reset();
    this._loadGrid(currentGrid);
    this._detectSlots();
    this._buildCrossingMap();
    this._initDomains();
    this._ac3Full();

    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot) {
      return { candidates: [], slot: null, totalCandidates: 0, error: 'Slot not found' };
    }

    const domain = slot.domain.filter((w) => !this._isExcluded(w));
    const totalCandidates = domain.length;

    // Score all candidates
    let candidates = domain.map((word) => ({
      word,
      wordScore: this.wordIndex.getScore(word),
      gridScore: 0,
      viable: true,
    }));

    // Sort by word score first
    candidates.sort((a, b) => b.wordScore - a.wordScore);

    // Compute grid scores (for all, or top N for very large domains)
    if (computeGridScore && candidates.length > 0) {
      const scoreable =
        candidates.length <= gridScoreLimit ? candidates : candidates.slice(0, gridScoreLimit);
      for (const cand of scoreable) {
        cand.gridScore = this._computeGridScore(slot, cand.word);
        if (cand.gridScore < 0.01) cand.viable = false;
      }
      // Sort scored candidates by combined score, then append unscored
      if (candidates.length > gridScoreLimit) {
        const scored = candidates.slice(0, gridScoreLimit);
        const unscored = candidates.slice(gridScoreLimit);
        scored.sort(
          (a, b) =>
            b.gridScore * b.wordScore - a.gridScore * a.wordScore || b.wordScore - a.wordScore
        );
        candidates = [...scored, ...unscored];
      } else {
        candidates.sort(
          (a, b) =>
            b.gridScore * b.wordScore - a.gridScore * a.wordScore || b.wordScore - a.wordScore
        );
      }
    }

    return {
      candidates,
      slot: { id: slot.id, direction: slot.direction, length: slot.length, pattern: slot.pattern },
      totalCandidates,
    };
  }

  /**
   * Find the most constrained unfilled slot (Best Location).
   *
   * @param {string[][]} currentGrid
   * @returns {{ slot, domainSize, reason } | null}
   */
  findBestLocation(currentGrid) {
    this._reset();
    this._loadGrid(currentGrid);
    this._detectSlots();
    this._buildCrossingMap();
    this._initDomains();
    this._ac3Full();

    let best = null;
    let minDomain = Infinity;

    for (const slot of this.slots) {
      if (slot.filled) continue;
      const size = slot.domain.length;
      if (size < minDomain) {
        minDomain = size;
        best = slot;
      }
    }

    if (!best) return null;

    return {
      slot: {
        id: best.id,
        direction: best.direction,
        startRow: best.startRow,
        startCol: best.startCol,
        length: best.length,
      },
      domainSize: minDomain,
      reason:
        minDomain === 0
          ? 'Dead end — no valid words for this slot'
          : `Most constrained slot (${minDomain} valid word${minDomain !== 1 ? 's' : ''})`,
    };
  }

  // ─── Grid Setup ───────────────────────────────────────────────────

  _emptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY_CELL));
  }

  _reset() {
    this.grid = this._emptyGrid();
    this.solution = this._emptyGrid();
    this.slots = [];
    this.placedWords = [];
    this.crossings = new Map();
    this.complete = false;
    this.stats.slotsFilled = 0;
    this.stats.backtrackCount = 0;
    this.stats.patternSearches = 0;
  }

  _loadGrid(existingGrid) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = existingGrid[r]?.[c] || EMPTY_CELL;
        this.grid[r][c] = cell;
      }
    }
  }

  _getBlackSquareGrid() {
    return this.grid.map((row) =>
      row.map((cell) => (cell === BLACK_SQUARE ? BLACK_SQUARE : EMPTY_CELL))
    );
  }

  // ─── Pattern Templates ────────────────────────────────────────────

  /** Quality 5×5 patterns with rotational symmetry already applied */
  _getPatterns() {
    return [
      // Pattern 1: Open grid, single center black
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 2: Symmetric diagonal pair
      [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 3: Symmetric center column
      [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 4: Symmetric off-center
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 5: Wide open (no blacks — all 5-letter words)
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      // Pattern 6: Two symmetric pairs
      [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ],
    ];
  }

  _applyRandomPattern(symmetry) {
    const patterns = this._getPatterns();
    const base = patterns[Math.floor(Math.random() * patterns.length)];

    // Apply symmetry enforcement
    const pattern = base.map((row) => [...row]);
    if (symmetry === 'rotational' || symmetry === 'none') {
      // Patterns already have rotational symmetry built in
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (base[r][c] === 1) {
            pattern[GRID_SIZE - 1 - r][GRID_SIZE - 1 - c] = 1;
          }
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (pattern[r][c] === 1) {
          this.grid[r][c] = BLACK_SQUARE;
        }
      }
    }
  }

  // ─── Slot Detection ───────────────────────────────────────────────

  _detectSlots() {
    this.slots = [];

    // Across slots
    for (let r = 0; r < GRID_SIZE; r++) {
      let c = 0;
      while (c < GRID_SIZE) {
        if (this.grid[r][c] !== BLACK_SQUARE) {
          let length = 0;
          const startCol = c;
          while (c < GRID_SIZE && this.grid[r][c] !== BLACK_SQUARE) {
            length++;
            c++;
          }
          if (length >= 2) {
            this.slots.push(this._makeSlot('across', r, startCol, length));
          }
        } else {
          c++;
        }
      }
    }

    // Down slots
    for (let c = 0; c < GRID_SIZE; c++) {
      let r = 0;
      while (r < GRID_SIZE) {
        if (this.grid[r][c] !== BLACK_SQUARE) {
          let length = 0;
          const startRow = r;
          while (r < GRID_SIZE && this.grid[r][c] !== BLACK_SQUARE) {
            length++;
            r++;
          }
          if (length >= 2) {
            this.slots.push(this._makeSlot('down', startRow, c, length));
          }
        } else {
          r++;
        }
      }
    }

    logger.debug(`[Generator] Detected ${this.slots.length} word slots`);
  }

  _makeSlot(direction, startRow, startCol, length) {
    const id = `${direction}-${startRow}-${startCol}`;

    // Read current pattern from grid
    let pattern = '';
    const cells = [];
    for (let i = 0; i < length; i++) {
      const r = direction === 'across' ? startRow : startRow + i;
      const c = direction === 'across' ? startCol + i : startCol;
      const cell = this.grid[r][c];
      pattern += cell && cell !== EMPTY_CELL && cell !== BLACK_SQUARE ? cell : '.';
      cells.push({ row: r, col: c });
    }

    // Check if already filled (all letters present)
    const filled = !pattern.includes('.');

    return {
      id,
      direction,
      startRow,
      startCol,
      length,
      pattern,
      cells,
      filled,
      word: filled ? pattern : null,
      domain: [], // populated by _initDomains
    };
  }

  // ─── Crossing Map ─────────────────────────────────────────────────

  /**
   * Build a map of which slots cross which other slots, and at what positions.
   * crossings.get(slotId) = [{ crossSlot, posInThis, posInCross }]
   */
  _buildCrossingMap() {
    this.crossings = new Map();

    // Build cell → slot lookup
    const cellToSlot = new Map(); // "r,c" → [{slot, posInSlot}]
    for (const slot of this.slots) {
      for (let i = 0; i < slot.cells.length; i++) {
        const key = `${slot.cells[i].row},${slot.cells[i].col}`;
        if (!cellToSlot.has(key)) cellToSlot.set(key, []);
        cellToSlot.get(key).push({ slot, posInSlot: i });
      }
    }

    // For each cell with 2 slots (across + down), record the crossing
    for (const entries of cellToSlot.values()) {
      if (entries.length === 2) {
        const [a, b] = entries;

        if (!this.crossings.has(a.slot.id)) this.crossings.set(a.slot.id, []);
        this.crossings.get(a.slot.id).push({
          crossSlot: b.slot,
          posInThis: a.posInSlot,
          posInCross: b.posInSlot,
        });

        if (!this.crossings.has(b.slot.id)) this.crossings.set(b.slot.id, []);
        this.crossings.get(b.slot.id).push({
          crossSlot: a.slot,
          posInThis: b.posInSlot,
          posInCross: a.posInSlot,
        });
      }
    }
  }

  // ─── Domain Initialization ────────────────────────────────────────

  _initDomains() {
    for (const slot of this.slots) {
      if (slot.filled) {
        slot.domain = [slot.word];
        this.placedWords.push({
          word: slot.word,
          direction: slot.direction,
          startRow: slot.startRow,
          startCol: slot.startCol,
        });
        continue;
      }

      this.stats.patternSearches++;
      const candidates = this.wordIndex.getCandidatesAboveThreshold(slot.pattern, this.minScore);
      slot.domain = candidates.filter((w) => !this._isExcluded(w));
    }
  }

  _isExcluded(word) {
    if (this.excludeWords.has(word)) return true;
    if (this.placedWords.some((pw) => pw.word === word)) return true;
    return false;
  }

  // ─── AC-3 Constraint Propagation ──────────────────────────────────

  /**
   * Full AC-3: enforce arc consistency across all crossing slot pairs.
   * Returns false if any domain becomes empty (unsolvable).
   */
  _ac3Full() {
    // Initialize queue with all arcs
    const queue = [];
    for (const slot of this.slots) {
      const crossings = this.crossings.get(slot.id) || [];
      for (const crossing of crossings) {
        queue.push({ slot, crossing });
      }
    }

    return this._ac3(queue);
  }

  /**
   * AC-3 from a specific slot (after placing a word).
   * Only enqueues arcs involving neighbors of the changed slot.
   */
  _ac3FromSlot(changedSlot) {
    const queue = [];
    const crossings = this.crossings.get(changedSlot.id) || [];

    for (const crossing of crossings) {
      // The crossing slot needs to be checked against all ITS neighbors
      const neighborCrossings = this.crossings.get(crossing.crossSlot.id) || [];
      for (const nc of neighborCrossings) {
        queue.push({ slot: crossing.crossSlot, crossing: nc });
      }
    }

    return this._ac3(queue);
  }

  /**
   * Core AC-3 algorithm.
   * For each arc (slotA, slotB at crossing), remove words from slotA's domain
   * that have no compatible word in slotB's domain at the crossing letter.
   */
  _ac3(queue) {
    const inQueue = new Set(queue.map((q) => `${q.slot.id}→${q.crossing.crossSlot.id}`));

    while (queue.length > 0) {
      const { slot, crossing } = queue.shift();
      const arcKey = `${slot.id}→${crossing.crossSlot.id}`;
      inQueue.delete(arcKey);

      if (slot.filled) continue;

      const { crossSlot, posInThis, posInCross } = crossing;

      // What letters are possible at the crossing position in the cross slot?
      const crossLetters = new Set();
      for (const word of crossSlot.domain) {
        crossLetters.add(word[posInCross]);
      }

      // Filter this slot's domain to only words whose letter at posInThis is in crossLetters
      const before = slot.domain.length;
      slot.domain = slot.domain.filter((word) => crossLetters.has(word[posInThis]));

      if (slot.domain.length === 0) return false; // Dead end

      // If domain changed, re-enqueue arcs for this slot's other neighbors
      if (slot.domain.length < before) {
        const myCrossings = this.crossings.get(slot.id) || [];
        for (const mc of myCrossings) {
          if (mc.crossSlot.id === crossSlot.id) continue; // Skip the one we just checked
          const key = `${mc.crossSlot.id}→${slot.id}`;
          if (!inQueue.has(key)) {
            // Enqueue the reverse arc: neighbor checking against this slot
            const revCrossings = this.crossings.get(mc.crossSlot.id) || [];
            const revCrossing = revCrossings.find((rc) => rc.crossSlot.id === slot.id);
            if (revCrossing) {
              queue.push({ slot: mc.crossSlot, crossing: revCrossing });
              inQueue.add(key);
            }
          }
        }
      }
    }

    return true;
  }

  // ─── Backtracking Solver ──────────────────────────────────────────

  _solve() {
    const deadline = this.stats.startTime + this.timeoutMs;

    const result = this._backtrack(deadline);
    return result;
  }

  _backtrack(deadline) {
    // Check timeout
    if (Date.now() > deadline) return false;

    // All slots filled?
    const unfilled = this.slots.filter((s) => !s.filled);
    if (unfilled.length === 0) return true;

    // MRV: pick slot with smallest domain
    let bestSlot = null;
    let minSize = Infinity;
    for (const slot of unfilled) {
      const size = slot.domain.length;
      if (size < minSize) {
        minSize = size;
        bestSlot = slot;
      }
      if (size === 0) return false; // Dead end
    }

    // Try each word in this slot's domain
    // In randomize mode, use the pre-shuffled domain order for variety.
    // Otherwise, sort by word score (highest first) for deterministic quality.
    const orderedDomain = this._randomize
      ? [...bestSlot.domain]
      : [...bestSlot.domain].sort(
          (a, b) => (this.wordIndex.getScore(b) || 0) - (this.wordIndex.getScore(a) || 0)
        );

    for (const word of orderedDomain) {
      // Skip if already placed in this puzzle
      if (this.placedWords.some((pw) => pw.word === word)) continue;

      // Save state for backtracking
      const savedDomains = new Map();
      for (const slot of this.slots) {
        savedDomains.set(slot.id, [...slot.domain]);
      }
      const savedGridCells = [];
      for (const cell of bestSlot.cells) {
        savedGridCells.push(this.grid[cell.row][cell.col]);
      }

      // Place word
      this._placeWord(bestSlot, word);

      // Propagate constraints
      if (this._ac3FromSlot(bestSlot)) {
        // Forward check: ensure no unfilled neighbor has empty domain
        let viable = true;
        const neighbors = this.crossings.get(bestSlot.id) || [];
        for (const { crossSlot } of neighbors) {
          if (!crossSlot.filled && crossSlot.domain.length === 0) {
            viable = false;
            break;
          }
        }

        if (viable && this._backtrack(deadline)) {
          return true;
        }
      }

      // Backtrack: undo placement, restore domains
      this._unplaceWord(bestSlot, savedGridCells);
      for (const slot of this.slots) {
        slot.domain = savedDomains.get(slot.id);
      }
      this.stats.backtrackCount++;
    }

    return false;
  }

  _placeWord(slot, word) {
    for (let i = 0; i < slot.length; i++) {
      this.grid[slot.cells[i].row][slot.cells[i].col] = word[i];
    }
    slot.filled = true;
    slot.word = word;
    slot.domain = [word];
    this.placedWords.push({
      word,
      direction: slot.direction,
      startRow: slot.startRow,
      startCol: slot.startCol,
    });
    this.stats.slotsFilled++;

    // Update patterns of crossing slots
    const crossings = this.crossings.get(slot.id) || [];
    for (const { crossSlot, posInThis, posInCross } of crossings) {
      if (!crossSlot.filled) {
        const patArr = crossSlot.pattern.split('');
        patArr[posInCross] = word[posInThis];
        crossSlot.pattern = patArr.join('');

        // Filter domain to match new constraint
        const letter = word[posInThis];
        crossSlot.domain = crossSlot.domain.filter(
          (w) => w[posInCross] === letter && !this.placedWords.some((pw) => pw.word === w)
        );
      }
    }
  }

  _unplaceWord(slot, savedGridCells) {
    // Restore grid cells (only cells not part of other placed words)
    for (let i = 0; i < slot.cells.length; i++) {
      const { row, col } = slot.cells[i];
      // Check if this cell is part of another placed word (crossing)
      const isShared = this.placedWords.some((pw) => {
        if (
          pw.word === slot.word &&
          pw.direction === slot.direction &&
          pw.startRow === slot.startRow &&
          pw.startCol === slot.startCol
        ) {
          return false; // Skip the word we're removing
        }
        const otherSlot = this.slots.find(
          (s) =>
            s.direction === pw.direction && s.startRow === pw.startRow && s.startCol === pw.startCol
        );
        return otherSlot?.cells.some((c) => c.row === row && c.col === col);
      });

      if (!isShared) {
        this.grid[row][col] = savedGridCells[i];
      }
    }

    slot.filled = false;
    slot.word = null;
    this.placedWords = this.placedWords.filter(
      (pw) =>
        !(
          pw.direction === slot.direction &&
          pw.startRow === slot.startRow &&
          pw.startCol === slot.startCol
        )
    );
    this.stats.slotsFilled--;

    // Restore pattern
    let pattern = '';
    for (const cell of slot.cells) {
      const val = this.grid[cell.row][cell.col];
      pattern += val && val !== EMPTY_CELL && val !== BLACK_SQUARE ? val : '.';
    }
    slot.pattern = pattern;
  }

  // ─── Scoring ──────────────────────────────────────────────────────

  /**
   * Compute Grid Score for placing a candidate word in a slot.
   * Grid Score = geometric mean of (neighbor domain sizes after / before).
   * Higher = less constraining = better.
   */
  _computeGridScore(slot, word) {
    const crossings = this.crossings.get(slot.id) || [];
    if (crossings.length === 0) return 10; // No crossings = perfect

    let logSum = 0;
    let count = 0;

    for (const { crossSlot, posInThis, posInCross } of crossings) {
      if (crossSlot.filled) continue;

      const letter = word[posInThis];
      const before = crossSlot.domain.length;
      if (before === 0) return 0;

      // Count how many words in the cross slot's domain have the right letter
      let after = 0;
      for (const w of crossSlot.domain) {
        if (w[posInCross] === letter) after++;
      }

      if (after === 0) return 0; // Non-viable

      logSum += Math.log(after / before);
      count++;
    }

    if (count === 0) return 10;
    return Math.exp(logSum / count) * 10; // Scale to ~0-10 range
  }

  /**
   * Calculate grid quality on a 0-100 scale based on professional crossword standards.
   *
   * Components (weights sum to 100):
   *   - Average Word Score (40%): Overall fill quality from dictionary scores
   *   - Weakest Word (20%): Puzzle is only as strong as its worst entry
   *   - Consistency (20%): Penalizes grids with multiple weak entries (score < 40)
   *   - Word Length (10%): Penalizes 2-letter words, rewards longer fill
   *   - Letter Variety (10%): Diverse letter usage indicates better construction
   */
  _calculateQuality() {
    const totalWords = this.placedWords.length;
    if (totalWords === 0) {
      return {
        score: 0,
        averageWordScore: 0,
        minWordScore: 0,
        weakWordCount: 0,
        weakWords: [],
        twoLetterWords: 0,
        threeLetterWords: 0,
        fourPlusWords: 0,
        letterVariety: 0,
        blackCount: 0,
        totalWords: 0,
      };
    }

    // Gather per-word scores and lengths
    const wordData = this.placedWords.map((pw) => ({
      word: pw.word,
      score: this.wordIndex.getScore(pw.word),
      length: pw.word.length,
    }));

    const scores = wordData.map((w) => w.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / totalWords;
    const minScore = Math.min(...scores);

    const weakThreshold = 40;
    const weakWords = wordData.filter((w) => w.score < weakThreshold);

    const twoLetterWords = wordData.filter((w) => w.length === 2).length;
    const threeLetterWords = wordData.filter((w) => w.length === 3).length;
    const fourPlusWords = wordData.filter((w) => w.length >= 4).length;

    // 1. Average Word Score (40 points max)
    const avgComponent = Math.min(40, avgScore * 0.4);

    // 2. Weakest Word (20 points max) — scale so score 50+ gets full marks
    const minComponent = Math.min(20, minScore * 0.4);

    // 3. Consistency (20 points max) — penalize each weak word
    const consistencyComponent = Math.max(0, 20 - weakWords.length * 4);

    // 4. Word Length (10 points max) — penalize 2-letter words
    const lengthComponent = Math.max(0, Math.min(10, 10 - twoLetterWords * 3));

    // 5. Letter Variety (10 points max)
    const allLetters = [];
    let blackCount = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] === BLACK_SQUARE) {
          blackCount++;
        } else if (this.grid[r][c]) {
          allLetters.push(this.grid[r][c]);
        }
      }
    }
    const uniqueLetters = new Set(allLetters).size;
    // 13+ unique letters out of 26 gets full marks
    const varietyComponent = Math.min(10, (uniqueLetters / 26) * 20);

    const score = Math.round(
      avgComponent + minComponent + consistencyComponent + lengthComponent + varietyComponent
    );

    return {
      score: Math.max(0, Math.min(100, score)),
      averageWordScore: Math.round(avgScore * 10) / 10,
      minWordScore: minScore,
      weakWordCount: weakWords.length,
      weakWords: weakWords.map((w) => w.word),
      twoLetterWords,
      threeLetterWords,
      fourPlusWords,
      letterVariety: uniqueLetters,
      blackCount,
      totalWords,
    };
  }

  // ─── Utilities ────────────────────────────────────────────────────

  /**
   * Shuffle an array with bias toward higher-scored words.
   * Splits into score tiers and shuffles within each tier.
   */
  _shuffleWithScoreBias(words) {
    // Group into tiers: 75+, 50-74, 25-49, 1-24
    const tiers = [[], [], [], []];
    for (const word of words) {
      const score = this.wordIndex.getScore(word);
      if (score >= 75) tiers[0].push(word);
      else if (score >= 50) tiers[1].push(word);
      else if (score >= 25) tiers[2].push(word);
      else tiers[3].push(word);
    }

    // Fisher-Yates shuffle within each tier
    for (const tier of tiers) {
      for (let i = tier.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tier[i], tier[j]] = [tier[j], tier[i]];
      }
    }

    return [...tiers[0], ...tiers[1], ...tiers[2], ...tiers[3]];
  }
}
