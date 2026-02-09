#!/usr/bin/env node
/* eslint-disable no-console, no-unused-vars */

/**
 * Performance & Quality Benchmark for Crossword Generator
 *
 * Run: node scripts/test-new-generator.js
 *
 * Tests:
 * 1. WordIndex loading speed
 * 2. Pattern lookup speed
 * 3. Generate from scratch (speed, quality, success rate)
 * 4. Fill mode with seed words
 * 5. QuickFill with randomness
 * 6. Candidate list generation
 *
 * Targets (from plan):
 * - Empty 5x5 fill: <500ms
 * - Fill with seeds: <1s
 * - Candidate list (50 words): <200ms
 * - Quick Fill response: <2s
 * - Fill success rate (empty): >95%
 * - Fill success rate (2 seeds): >80%
 * - Average word score: >50
 * - All words in dictionary: 100%
 */

const fs = require('fs');
const path = require('path');

// ─── Inline WordIndex (CommonJS version) ─────────────────────────

class WordIndex {
  constructor() {
    this.wordsByLength = new Map();
    this.scoreMap = new Map();
    this.posIndex = new Map();
  }

  loadFromDict(filePath) {
    const start = Date.now();
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let loaded = 0;

    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const si = t.lastIndexOf(';');
      if (si === -1) continue;
      const word = t.substring(0, si);
      const score = parseInt(t.substring(si + 1), 10);
      if (!word || !/^[A-Z]+$/.test(word) || isNaN(score) || score < 1 || score > 100) continue;

      const existing = this.scoreMap.get(word);
      if (existing !== undefined && existing >= score) continue;
      this.scoreMap.set(word, score);

      if (existing === undefined) {
        const len = word.length;
        if (!this.wordsByLength.has(len)) this.wordsByLength.set(len, []);
        this.wordsByLength.get(len).push(word);
        for (let pos = 0; pos < len; pos++) {
          const key = `${len},${pos},${word[pos]}`;
          if (!this.posIndex.has(key)) this.posIndex.set(key, new Set());
          this.posIndex.get(key).add(word);
        }
      }
      loaded++;
    }

    return { loaded, elapsed: Date.now() - start };
  }

  getCandidates(pattern) {
    const len = pattern.length;
    if (!this.wordsByLength.has(len)) return [];
    const constraints = [];
    for (let pos = 0; pos < len; pos++) {
      if (pattern[pos] !== '.' && pattern[pos] !== ' ') {
        constraints.push({ pos, letter: pattern[pos].toUpperCase() });
      }
    }
    if (constraints.length === 0) return [...this.wordsByLength.get(len)];
    const sets = constraints.map(({ pos, letter }) => {
      const key = `${len},${pos},${letter}`;
      return this.posIndex.get(key) || new Set();
    });
    sets.sort((a, b) => a.size - b.size);
    let result = sets[0];
    for (let i = 1; i < sets.length; i++) {
      const next = sets[i];
      const intersection = new Set();
      for (const w of result) if (next.has(w)) intersection.add(w);
      result = intersection;
      if (result.size === 0) return [];
    }
    return Array.from(result);
  }

  getCandidatesAboveThreshold(pattern, minScore = 1) {
    const candidates = this.getCandidates(pattern);
    if (minScore <= 1) return candidates;
    return candidates.filter((w) => (this.scoreMap.get(w) || 0) >= minScore);
  }

  getScore(word) {
    return this.scoreMap.get(word.toUpperCase()) || 0;
  }
  has(word) {
    return this.scoreMap.has(word.toUpperCase());
  }
}

// ─── Inline CrosswordGenerator (CommonJS version) ─────────────────

const BLACK_SQUARE = '■';
const EMPTY_CELL = '';
const GRID_SIZE = 5;

class CrosswordGenerator {
  constructor(wordIndex, options = {}) {
    this.wordIndex = wordIndex;
    this.minScore = options.minScore || 5;
    this.maxRetries = options.maxRetries || 50;
    this.timeoutMs = options.timeoutMs || 10000;
    this.excludeWords = new Set((options.excludeWords || []).map((w) => w.toUpperCase()));
    this.grid = this._emptyGrid();
    this.solution = this._emptyGrid();
    this.slots = [];
    this.placedWords = [];
    this.complete = false;
    this.crossings = new Map();
    this.stats = {
      totalAttempts: 0,
      backtrackCount: 0,
      slotsFilled: 0,
      patternSearches: 0,
      startTime: null,
      excludedWordsCount: this.excludeWords.size,
    };
  }

  generate(mode = 'scratch', existingGrid = null, symmetry = 'none') {
    this.stats.startTime = Date.now();
    let attempts = 0,
      success = false;
    while (!success && attempts < this.maxRetries) {
      attempts++;
      this.stats.totalAttempts = attempts;
      try {
        this._reset();
        if (mode === 'fill' && existingGrid) this._loadGrid(existingGrid);
        else this._applyRandomPattern(symmetry);
        this._detectSlots();
        this._buildCrossingMap();
        this._initDomains();
        if (!this._ac3Full()) throw new Error('AC-3 unsolvable');
        if (!this._solve()) throw new Error('Backtracking failed');
        const quality = this._calculateQuality();
        if (quality.score < 0 || quality.twoLetterWords > 4) throw new Error('Quality too low');
        this.solution = this.grid.map((r) => [...r]);
        Object.assign(this.stats, quality);
        this.complete = true;
        success = true;
      } catch (err) {
        /* retry */
      }
    }
    if (!success) throw new Error(`Failed after ${this.maxRetries} attempts`);
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
      stats: { ...this.stats, elapsedTime: Date.now() - this.stats.startTime },
    };
  }

  quickFill(currentGrid, options = {}) {
    const startTime = Date.now();
    this.stats.startTime = startTime;
    this._reset();
    this._loadGrid(currentGrid);
    this._detectSlots();
    this._buildCrossingMap();
    if (options.minScore !== undefined) this.minScore = options.minScore;
    if (options.excludeWords)
      for (const w of options.excludeWords) this.excludeWords.add(w.toUpperCase());
    this._initDomains();
    if (!this._ac3Full()) return { success: false, error: 'No valid fill' };
    for (const slot of this.slots) {
      if (!slot.filled) slot.domain = this._shuffleWithScoreBias(slot.domain);
    }
    if (!this._solve()) return { success: false, error: 'Could not complete' };
    const quality = this._calculateQuality();
    return {
      success: true,
      solution: this.grid.map((r) => [...r]),
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
  }

  getCandidatesForSlot(currentGrid, slotId, options = {}) {
    const limit = options.limit || 100;
    this._reset();
    this._loadGrid(currentGrid);
    this._detectSlots();
    this._buildCrossingMap();
    this._initDomains();
    this._ac3Full();
    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot) return { candidates: [], slot: null, totalCandidates: 0 };
    const domain = slot.domain.filter(
      (w) => !this.excludeWords.has(w) && !this.placedWords.some((pw) => pw.word === w)
    );
    const candidates = domain.map((word) => ({
      word,
      wordScore: this.wordIndex.getScore(word),
      gridScore: 0,
      viable: true,
    }));
    candidates.sort((a, b) => b.wordScore - a.wordScore);
    return {
      candidates: candidates.slice(0, limit),
      slot: { id: slot.id, direction: slot.direction, length: slot.length },
      totalCandidates: domain.length,
    };
  }

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
  _loadGrid(g) {
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) this.grid[r][c] = g[r]?.[c] || EMPTY_CELL;
  }
  _getBlackSquareGrid() {
    return this.grid.map((row) =>
      row.map((cell) => (cell === BLACK_SQUARE ? BLACK_SQUARE : EMPTY_CELL))
    );
  }

  _getPatterns() {
    return [
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
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
    const pattern = base.map((row) => [...row]);
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (base[r][c] === 1) pattern[GRID_SIZE - 1 - r][GRID_SIZE - 1 - c] = 1;
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) if (pattern[r][c] === 1) this.grid[r][c] = BLACK_SQUARE;
  }

  _detectSlots() {
    this.slots = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      let c = 0;
      while (c < GRID_SIZE) {
        if (this.grid[r][c] !== BLACK_SQUARE) {
          let len = 0;
          const sc = c;
          while (c < GRID_SIZE && this.grid[r][c] !== BLACK_SQUARE) {
            len++;
            c++;
          }
          if (len >= 2) this.slots.push(this._makeSlot('across', r, sc, len));
        } else c++;
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let r = 0;
      while (r < GRID_SIZE) {
        if (this.grid[r][c] !== BLACK_SQUARE) {
          let len = 0;
          const sr = r;
          while (r < GRID_SIZE && this.grid[r][c] !== BLACK_SQUARE) {
            len++;
            r++;
          }
          if (len >= 2) this.slots.push(this._makeSlot('down', sr, c, len));
        } else r++;
      }
    }
  }

  _makeSlot(dir, sr, sc, len) {
    const id = `${dir}-${sr}-${sc}`;
    let pattern = '';
    const cells = [];
    for (let i = 0; i < len; i++) {
      const r = dir === 'across' ? sr : sr + i;
      const c = dir === 'across' ? sc + i : sc;
      const cell = this.grid[r][c];
      pattern += cell && cell !== EMPTY_CELL && cell !== BLACK_SQUARE ? cell : '.';
      cells.push({ row: r, col: c });
    }
    const filled = !pattern.includes('.');
    return {
      id,
      direction: dir,
      startRow: sr,
      startCol: sc,
      length: len,
      pattern,
      cells,
      filled,
      word: filled ? pattern : null,
      domain: [],
    };
  }

  _buildCrossingMap() {
    this.crossings = new Map();
    const cellToSlot = new Map();
    for (const slot of this.slots)
      for (let i = 0; i < slot.cells.length; i++) {
        const key = `${slot.cells[i].row},${slot.cells[i].col}`;
        if (!cellToSlot.has(key)) cellToSlot.set(key, []);
        cellToSlot.get(key).push({ slot, posInSlot: i });
      }
    for (const entries of cellToSlot.values()) {
      if (entries.length === 2) {
        const [a, b] = entries;
        if (!this.crossings.has(a.slot.id)) this.crossings.set(a.slot.id, []);
        this.crossings
          .get(a.slot.id)
          .push({ crossSlot: b.slot, posInThis: a.posInSlot, posInCross: b.posInSlot });
        if (!this.crossings.has(b.slot.id)) this.crossings.set(b.slot.id, []);
        this.crossings
          .get(b.slot.id)
          .push({ crossSlot: a.slot, posInThis: b.posInSlot, posInCross: a.posInSlot });
      }
    }
  }

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
      slot.domain = this.wordIndex
        .getCandidatesAboveThreshold(slot.pattern, this.minScore)
        .filter((w) => !this.excludeWords.has(w));
    }
  }

  _ac3Full() {
    const queue = [];
    for (const slot of this.slots)
      for (const crossing of this.crossings.get(slot.id) || []) queue.push({ slot, crossing });
    return this._ac3(queue);
  }
  _ac3FromSlot(changedSlot) {
    const queue = [];
    for (const crossing of this.crossings.get(changedSlot.id) || []) {
      for (const nc of this.crossings.get(crossing.crossSlot.id) || [])
        queue.push({ slot: crossing.crossSlot, crossing: nc });
    }
    return this._ac3(queue);
  }

  _ac3(queue) {
    const inQueue = new Set(queue.map((q) => `${q.slot.id}→${q.crossing.crossSlot.id}`));
    while (queue.length > 0) {
      const { slot, crossing } = queue.shift();
      inQueue.delete(`${slot.id}→${crossing.crossSlot.id}`);
      if (slot.filled) continue;
      const { crossSlot, posInThis, posInCross } = crossing;
      const crossLetters = new Set();
      for (const word of crossSlot.domain) crossLetters.add(word[posInCross]);
      const before = slot.domain.length;
      slot.domain = slot.domain.filter((word) => crossLetters.has(word[posInThis]));
      if (slot.domain.length === 0) return false;
      if (slot.domain.length < before) {
        for (const mc of this.crossings.get(slot.id) || []) {
          if (mc.crossSlot.id === crossSlot.id) continue;
          const key = `${mc.crossSlot.id}→${slot.id}`;
          if (!inQueue.has(key)) {
            const rev = (this.crossings.get(mc.crossSlot.id) || []).find(
              (rc) => rc.crossSlot.id === slot.id
            );
            if (rev) {
              queue.push({ slot: mc.crossSlot, crossing: rev });
              inQueue.add(key);
            }
          }
        }
      }
    }
    return true;
  }

  _solve() {
    return this._backtrack(this.stats.startTime + this.timeoutMs);
  }

  _backtrack(deadline) {
    if (Date.now() > deadline) return false;
    const unfilled = this.slots.filter((s) => !s.filled);
    if (unfilled.length === 0) return true;
    let bestSlot = null,
      minSize = Infinity;
    for (const slot of unfilled) {
      if (slot.domain.length < minSize) {
        minSize = slot.domain.length;
        bestSlot = slot;
      }
      if (slot.domain.length === 0) return false;
    }
    const ordered = [...bestSlot.domain].sort(
      (a, b) => (this.wordIndex.getScore(b) || 0) - (this.wordIndex.getScore(a) || 0)
    );
    for (const word of ordered) {
      if (this.placedWords.some((pw) => pw.word === word)) continue;
      const savedDomains = new Map();
      for (const s of this.slots) savedDomains.set(s.id, [...s.domain]);
      const savedCells = bestSlot.cells.map((c) => this.grid[c.row][c.col]);
      this._placeWord(bestSlot, word);
      if (this._ac3FromSlot(bestSlot)) {
        let viable = true;
        for (const { crossSlot } of this.crossings.get(bestSlot.id) || []) {
          if (!crossSlot.filled && crossSlot.domain.length === 0) {
            viable = false;
            break;
          }
        }
        if (viable && this._backtrack(deadline)) return true;
      }
      this._unplaceWord(bestSlot, savedCells);
      for (const s of this.slots) s.domain = savedDomains.get(s.id);
      this.stats.backtrackCount++;
    }
    return false;
  }

  _placeWord(slot, word) {
    for (let i = 0; i < slot.length; i++) this.grid[slot.cells[i].row][slot.cells[i].col] = word[i];
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
    for (const { crossSlot, posInThis, posInCross } of this.crossings.get(slot.id) || []) {
      if (!crossSlot.filled) {
        const pa = crossSlot.pattern.split('');
        pa[posInCross] = word[posInThis];
        crossSlot.pattern = pa.join('');
        const letter = word[posInThis];
        crossSlot.domain = crossSlot.domain.filter(
          (w) => w[posInCross] === letter && !this.placedWords.some((pw) => pw.word === w)
        );
      }
    }
  }

  _unplaceWord(slot, savedCells) {
    for (let i = 0; i < slot.cells.length; i++) {
      const { row, col } = slot.cells[i];
      const isShared = this.placedWords.some((pw) => {
        if (
          pw.word === slot.word &&
          pw.direction === slot.direction &&
          pw.startRow === slot.startRow &&
          pw.startCol === slot.startCol
        )
          return false;
        const os = this.slots.find(
          (s) =>
            s.direction === pw.direction && s.startRow === pw.startRow && s.startCol === pw.startCol
        );
        return os?.cells.some((c) => c.row === row && c.col === col);
      });
      if (!isShared) this.grid[row][col] = savedCells[i];
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
    let pattern = '';
    for (const cell of slot.cells) {
      const val = this.grid[cell.row][cell.col];
      pattern += val && val !== EMPTY_CELL && val !== BLACK_SQUARE ? val : '.';
    }
    slot.pattern = pattern;
  }

  _shuffleWithScoreBias(words) {
    const tiers = [[], [], [], []];
    for (const word of words) {
      const score = this.wordIndex.getScore(word);
      if (score >= 75) tiers[0].push(word);
      else if (score >= 50) tiers[1].push(word);
      else if (score >= 25) tiers[2].push(word);
      else tiers[3].push(word);
    }
    for (const tier of tiers) {
      for (let i = tier.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tier[i], tier[j]] = [tier[j], tier[i]];
      }
    }
    return [...tiers[0], ...tiers[1], ...tiers[2], ...tiers[3]];
  }

  _calculateQuality() {
    const lens = this.placedWords.map((pw) => pw.word.length);
    const two = lens.filter((l) => l === 2).length;
    const three = lens.filter((l) => l === 3).length;
    const fourPlus = lens.filter((l) => l >= 4).length;
    let totalScore = 0;
    for (const pw of this.placedWords) totalScore += this.wordIndex.getScore(pw.word);
    const avg =
      this.placedWords.length > 0
        ? Math.round((totalScore / this.placedWords.length) * 10) / 10
        : 0;
    let score = 100 - two * 30 + three * 10 + fourPlus * 20 + this.placedWords.length * 5;
    if (avg >= 50) score += 20;
    else if (avg >= 30) score += 10;
    else if (avg < 15) score -= 20;
    return {
      score,
      twoLetterWords: two,
      threeLetterWords: three,
      fourPlusWords: fourPlus,
      averageWordScore: avg,
      totalWords: this.placedWords.length,
    };
  }
}

// ─── Benchmark Helpers ─────────────────────────────────────────────

function printGrid(solution) {
  for (const row of solution) {
    console.log('  ' + row.map((c) => (c === BLACK_SQUARE ? '■' : c || '.')).join(' '));
  }
}

function check(name, actual, op, expected) {
  let pass;
  switch (op) {
    case '<':
      pass = actual < expected;
      break;
    case '>':
      pass = actual > expected;
      break;
    case '>=':
      pass = actual >= expected;
      break;
    case '<=':
      pass = actual <= expected;
      break;
    case '==':
      pass = actual === expected;
      break;
    default:
      pass = false;
  }
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon} ${name}: ${actual} ${op} ${expected}`);
  return pass;
}

// ─── Run Benchmarks ────────────────────────────────────────────────

function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Crossword Generator — Performance & Quality Report ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const dictPath = path.join(__dirname, '..', 'database', 'crossword-master.dict');
  const wordIndex = new WordIndex();

  // ─── 1. WordIndex Loading ─────────────────────
  console.log('── 1. WordIndex Loading ──');
  const loadResult = wordIndex.loadFromDict(dictPath);
  console.log(`  Words: ${loadResult.loaded.toLocaleString()}`);
  check('Load time', loadResult.elapsed, '<', 200);
  check('Word count', loadResult.loaded, '>', 40000);
  console.log();

  // ─── 2. Pattern Lookup Speed ──────────────────
  console.log('── 2. Pattern Lookup Speed ──');
  const patterns = ['A....', '.R..E', '..T', 'C....', '.....', 'B.A.T'];
  const lookupTimes = [];
  for (const pat of patterns) {
    const start = performance.now();
    const count = wordIndex.getCandidatesAboveThreshold(pat, 25).length;
    const elapsed = performance.now() - start;
    lookupTimes.push(elapsed);
    console.log(`  "${pat}" → ${count} candidates in ${elapsed.toFixed(3)}ms`);
  }
  const avgLookup = lookupTimes.reduce((a, b) => a + b, 0) / lookupTimes.length;
  check('Avg lookup', Math.round(avgLookup * 1000) / 1000, '<', 1);
  console.log();

  // ─── 3. Generate from Scratch ─────────────────
  console.log('── 3. Generate from Scratch (20 puzzles) ──');
  const N = 20;
  const times = [];
  const scores = [];
  const wordScores = [];
  let successCount = 0;
  let allDictWords = true;

  for (let i = 0; i < N; i++) {
    const gen = new CrosswordGenerator(wordIndex, {
      maxRetries: 10,
      minScore: 25,
      timeoutMs: 5000,
    });
    try {
      const result = gen.generate('scratch', null, 'rotational');
      successCount++;
      times.push(result.stats.elapsedTime);
      scores.push(result.stats.score);
      wordScores.push(result.stats.averageWordScore);
      for (const w of result.words) {
        if (!wordIndex.has(w.word)) {
          allDictWords = false;
          console.log(`  ⚠ Non-dictionary word: ${w.word}`);
        }
      }
    } catch (err) {
      console.log(`  Puzzle ${i + 1}: FAILED - ${err.message}`);
    }
  }

  const avgTime =
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const avgScore =
    wordScores.length > 0
      ? Math.round((wordScores.reduce((a, b) => a + b, 0) / wordScores.length) * 10) / 10
      : 0;
  const successRate = Math.round((successCount / N) * 100);

  console.log(`  Generated ${successCount}/${N} puzzles`);
  console.log(`  Avg time: ${avgTime}ms | Max time: ${maxTime}ms`);
  console.log(`  Avg word score: ${avgScore}`);
  check('Success rate', successRate, '>=', 95);
  check('Avg fill time', avgTime, '<', 500);
  check('Max fill time', maxTime, '<', 2000);
  check('Avg word score', avgScore, '>', 50);
  check('All words in dictionary', allDictWords, '==', true);
  console.log();

  // ─── 4. Fill with Seed Words ──────────────────
  console.log('── 4. Fill with Seed Words ──');
  const seedTests = [
    {
      name: 'CRANE (row 0)',
      grid: () => {
        const g = Array.from({ length: 5 }, () => Array(5).fill(''));
        g[0] = ['C', 'R', 'A', 'N', 'E'];
        return g;
      },
    },
    {
      name: 'BLOCK (row 0)',
      grid: () => {
        const g = Array.from({ length: 5 }, () => Array(5).fill(''));
        g[0] = ['B', 'L', 'O', 'C', 'K'];
        return g;
      },
    },
    {
      name: 'CRANE + BLAST',
      grid: () => {
        const g = Array.from({ length: 5 }, () => Array(5).fill(''));
        g[0] = ['C', 'R', 'A', 'N', 'E'];
        g[4] = ['B', 'L', 'A', 'S', 'T'];
        return g;
      },
    },
  ];

  let seedSuccesses = 0;
  for (const test of seedTests) {
    const gen = new CrosswordGenerator(wordIndex, { maxRetries: 10, minScore: 5, timeoutMs: 5000 });
    try {
      const result = gen.generate('fill', test.grid());
      seedSuccesses++;
      console.log(
        `  ✅ ${test.name}: ${result.stats.elapsedTime}ms, quality=${result.stats.score}, avg=${result.stats.averageWordScore}`
      );
    } catch (err) {
      console.log(`  ❌ ${test.name}: FAILED - ${err.message}`);
    }
  }
  check('Seed fill success', seedSuccesses, '>=', 2);
  console.log();

  // ─── 5. QuickFill (with randomness) ──────────
  console.log('── 5. QuickFill (10 calls, checking randomness) ──');
  const qfResults = new Set();
  const qfTimes = [];
  let qfSuccesses = 0;

  for (let i = 0; i < 10; i++) {
    const gen = new CrosswordGenerator(wordIndex, { minScore: 25, timeoutMs: 5000 });
    const grid = Array.from({ length: 5 }, () => Array(5).fill(''));
    grid[2][2] = '■'; // Center black for reliable filling
    const result = gen.quickFill(grid);
    if (result.success) {
      qfSuccesses++;
      qfTimes.push(result.elapsedMs);
      qfResults.add(result.solution[0].join(''));
    }
  }

  const qfAvgTime =
    qfTimes.length > 0 ? Math.round(qfTimes.reduce((a, b) => a + b, 0) / qfTimes.length) : 0;
  console.log(`  ${qfSuccesses}/10 successful fills`);
  console.log(`  ${qfResults.size} unique first rows (randomness check)`);
  console.log(`  Avg time: ${qfAvgTime}ms`);
  check('QuickFill success rate', qfSuccesses, '>=', 8);
  check('QuickFill avg time', qfAvgTime, '<', 2000);
  check('Randomness (unique fills)', qfResults.size, '>=', 3);
  console.log();

  // ─── 6. Candidate List Generation ─────────────
  console.log('── 6. Candidate List Generation ──');
  const candGrid = Array.from({ length: 5 }, () => Array(5).fill(''));
  const candStart = performance.now();
  const gen6 = new CrosswordGenerator(wordIndex, { minScore: 25, timeoutMs: 5000 });
  const candResult = gen6.getCandidatesForSlot(candGrid, 'across-0-0', { limit: 50 });
  const candElapsed = Math.round(performance.now() - candStart);

  console.log(
    `  Candidates for across-0-0: ${candResult.totalCandidates} total, ${candResult.candidates.length} returned`
  );
  console.log(`  Time: ${candElapsed}ms`);
  check('Candidate count', candResult.candidates.length, '>', 0);
  check('Candidate time', candElapsed, '<', 200);
  console.log();

  // ─── Summary ──────────────────────────────────
  console.log('═══════════════════════════════════════');
  console.log('  BENCHMARK COMPLETE');
  console.log('═══════════════════════════════════════');
}

main();
