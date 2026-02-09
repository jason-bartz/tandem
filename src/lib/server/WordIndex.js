/**
 * WordIndex — Position-Letter Index for Crossword Generation
 *
 * Replaces the Trie for crossword candidate lookups with a vastly faster
 * approach based on set intersection. For a pattern like "A..E.",
 * we intersect posIndex["5,0,A"] ∩ posIndex["5,3,E"] — nearly instant.
 *
 * Data structures:
 * - wordsByLength: Map<number, string[]>     — words grouped by length
 * - scoreMap: Map<string, number>            — word → score (1-100)
 * - posIndex: Map<string, Set<string>>       — "(length,pos,letter)" → Set<words>
 *
 * File format (.dict):
 *   WORD;SCORE
 *   # comments ignored
 *   One entry per line, uppercase A-Z, score 1-100
 */

import fs from 'fs';
import path from 'path';
import logger from '@/lib/logger';

export default class WordIndex {
  constructor() {
    this.wordsByLength = new Map(); // length → string[]
    this.scoreMap = new Map(); // word → score
    this.posIndex = new Map(); // "length,pos,letter" → Set<word>
    this._loaded = false;
  }

  /**
   * Load from a .dict file (WORD;SCORE format)
   */
  loadFromDict(filePath) {
    const startTime = Date.now();
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let loaded = 0;
    let skipped = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const semiIdx = trimmed.lastIndexOf(';');
      if (semiIdx === -1) {
        skipped++;
        continue;
      }

      const word = trimmed.substring(0, semiIdx);
      const score = parseInt(trimmed.substring(semiIdx + 1), 10);

      if (!word || !/^[A-Z]+$/.test(word) || isNaN(score) || score < 1 || score > 100) {
        skipped++;
        continue;
      }

      this._addWord(word, score);
      loaded++;
    }

    this._loaded = true;

    const elapsed = Date.now() - startTime;
    logger.info(
      `[WordIndex] Loaded ${loaded.toLocaleString()} words from ${path.basename(filePath)} in ${elapsed}ms`
    );
    if (skipped > 0) {
      logger.debug(`[WordIndex] Skipped ${skipped} invalid lines`);
    }

    this._logStats();
  }

  /**
   * Load from an array of {word, score} objects (for testing or programmatic use)
   */
  loadFromArray(entries) {
    for (const { word, score } of entries) {
      const upper = word.toUpperCase();
      if (/^[A-Z]+$/.test(upper) && score >= 1 && score <= 100) {
        this._addWord(upper, score);
      }
    }
    this._loaded = true;
  }

  /**
   * Internal: add a single word to all indexes
   */
  _addWord(word, score) {
    const len = word.length;

    // Score map — keep highest score if duplicate
    const existing = this.scoreMap.get(word);
    if (existing !== undefined && existing >= score) return;
    this.scoreMap.set(word, score);

    // Words by length — only add if new
    if (existing === undefined) {
      if (!this.wordsByLength.has(len)) {
        this.wordsByLength.set(len, []);
      }
      this.wordsByLength.get(len).push(word);

      // Position-letter index
      for (let pos = 0; pos < len; pos++) {
        const key = `${len},${pos},${word[pos]}`;
        if (!this.posIndex.has(key)) {
          this.posIndex.set(key, new Set());
        }
        this.posIndex.get(key).add(word);
      }
    }
  }

  /**
   * Get all candidate words matching a pattern.
   * Pattern: uppercase letters are fixed, "." is wildcard.
   * Example: "A..E." matches all 5-letter words with A at pos 0, E at pos 3.
   *
   * @param {string} pattern - e.g. "A..E."
   * @returns {string[]} matching words
   */
  getCandidates(pattern) {
    const len = pattern.length;
    if (!this.wordsByLength.has(len)) return [];

    // Collect constrained positions (non-wildcard)
    const constraints = [];
    for (let pos = 0; pos < len; pos++) {
      const ch = pattern[pos];
      if (ch !== '.' && ch !== ' ') {
        constraints.push({ pos, letter: ch.toUpperCase() });
      }
    }

    // No constraints = return all words of this length
    if (constraints.length === 0) {
      return [...this.wordsByLength.get(len)];
    }

    // Intersect sets for each constraint, starting with the smallest set
    const sets = constraints.map(({ pos, letter }) => {
      const key = `${len},${pos},${letter}`;
      return this.posIndex.get(key) || new Set();
    });

    // Sort by set size (smallest first for faster intersection)
    sets.sort((a, b) => a.size - b.size);

    // Intersect
    let result = sets[0];
    for (let i = 1; i < sets.length; i++) {
      const next = sets[i];
      const intersection = new Set();
      for (const word of result) {
        if (next.has(word)) {
          intersection.add(word);
        }
      }
      result = intersection;
      if (result.size === 0) return [];
    }

    return Array.from(result);
  }

  /**
   * Get candidates filtered by minimum score threshold.
   *
   * @param {string} pattern - e.g. "A..E."
   * @param {number} minScore - minimum score (1-100), default 1
   * @returns {string[]} matching words with score >= minScore
   */
  getCandidatesAboveThreshold(pattern, minScore = 1) {
    const candidates = this.getCandidates(pattern);
    if (minScore <= 1) return candidates;
    return candidates.filter((word) => (this.scoreMap.get(word) || 0) >= minScore);
  }

  /**
   * Get candidates sorted by score (highest first).
   *
   * @param {string} pattern - e.g. "A..E."
   * @param {number} minScore - minimum score threshold
   * @returns {{ word: string, score: number }[]} sorted by score desc
   */
  getCandidatesSorted(pattern, minScore = 1) {
    const candidates = this.getCandidatesAboveThreshold(pattern, minScore);
    return candidates
      .map((word) => ({ word, score: this.scoreMap.get(word) || 0 }))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  }

  /**
   * Count candidates for a pattern (without allocating the full array).
   * Useful for domain size calculations during constraint propagation.
   */
  countCandidates(pattern, minScore = 1) {
    // For unconstrained patterns, use the word list length
    const len = pattern.length;
    let hasConstraint = false;
    for (let i = 0; i < len; i++) {
      if (pattern[i] !== '.' && pattern[i] !== ' ') {
        hasConstraint = true;
        break;
      }
    }

    if (!hasConstraint) {
      if (minScore <= 1) return (this.wordsByLength.get(len) || []).length;
      return (this.wordsByLength.get(len) || []).filter(
        (w) => (this.scoreMap.get(w) || 0) >= minScore
      ).length;
    }

    // Otherwise do the full lookup
    return this.getCandidatesAboveThreshold(pattern, minScore).length;
  }

  /**
   * Get the score for a word.
   * @returns {number} score 1-100, or 0 if not found
   */
  getScore(word) {
    return this.scoreMap.get(word.toUpperCase()) || 0;
  }

  /**
   * Check if a word exists in the index.
   */
  has(word) {
    return this.scoreMap.has(word.toUpperCase());
  }

  /**
   * Get all words of a specific length.
   */
  getWordsByLength(length) {
    return this.wordsByLength.get(length) || [];
  }

  /**
   * Get statistics about the loaded index.
   */
  getStats() {
    const byLength = {};
    for (const [len, words] of this.wordsByLength) {
      byLength[len] = words.length;
    }

    const scores = Array.from(this.scoreMap.values());
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      totalWords: this.scoreMap.size,
      byLength,
      indexEntries: this.posIndex.size,
      averageScore: Math.round(avgScore * 10) / 10,
      loaded: this._loaded,
    };
  }

  _logStats() {
    const stats = this.getStats();
    logger.info(`[WordIndex] Total: ${stats.totalWords.toLocaleString()} words`);
    for (const [len, count] of Object.entries(stats.byLength).sort()) {
      logger.debug(`[WordIndex]   ${len}-letter: ${count.toLocaleString()}`);
    }
    logger.debug(`[WordIndex] Index entries: ${stats.indexEntries.toLocaleString()}`);
    logger.debug(`[WordIndex] Average score: ${stats.averageScore}`);
  }
}

/**
 * Singleton loader: builds a WordIndex from the master dictionary file.
 * Caches the instance so it's only loaded once per process.
 */
let _cachedIndex = null;

export function getWordIndex() {
  if (_cachedIndex) return _cachedIndex;

  const dictPath = path.join(process.cwd(), 'database', 'crossword-master.dict');

  if (!fs.existsSync(dictPath)) {
    throw new Error(
      `Master dictionary not found at ${dictPath}. Run: node scripts/build-crossword-dictionary.js`
    );
  }

  _cachedIndex = new WordIndex();
  _cachedIndex.loadFromDict(dictPath);
  return _cachedIndex;
}

/**
 * Clear the cached index (for testing or forced reload).
 */
export function clearWordIndexCache() {
  _cachedIndex = null;
}
