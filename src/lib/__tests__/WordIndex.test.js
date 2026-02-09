/**
 * @jest-environment node
 */

/**
 * WordIndex unit tests
 *
 * Tests the position-letter index used for crossword candidate lookups.
 * Covers: loading, pattern matching, scoring, filtering, and edge cases.
 */

import WordIndex, { getWordIndex, clearWordIndexCache } from '../server/WordIndex';

describe('WordIndex', () => {
  let index;

  beforeEach(() => {
    index = new WordIndex();
  });

  describe('loadFromArray', () => {
    it('should load words from an array of {word, score} objects', () => {
      index.loadFromArray([
        { word: 'ACE', score: 75 },
        { word: 'ACES', score: 60 },
        { word: 'BLAST', score: 80 },
      ]);

      expect(index.has('ACE')).toBe(true);
      expect(index.has('ACES')).toBe(true);
      expect(index.has('BLAST')).toBe(true);
      expect(index.has('MISSING')).toBe(false);
    });

    it('should normalize words to uppercase', () => {
      index.loadFromArray([{ word: 'hello', score: 50 }]);
      expect(index.has('HELLO')).toBe(true);
      expect(index.has('hello')).toBe(true); // has() normalizes
    });

    it('should reject words with non-A-Z characters', () => {
      index.loadFromArray([
        { word: 'GOOD', score: 50 },
        { word: 'BAD-WORD', score: 50 },
        { word: 'NO SPACE', score: 50 },
        { word: "CAN'T", score: 50 },
        { word: 'ABC123', score: 50 },
      ]);

      expect(index.has('GOOD')).toBe(true);
      expect(index.has('BAD-WORD')).toBe(false);
      expect(index.has('NO SPACE')).toBe(false);
      expect(index.has("CAN'T")).toBe(false);
      expect(index.has('ABC123')).toBe(false);
    });

    it('should reject invalid scores', () => {
      index.loadFromArray([
        { word: 'VALID', score: 50 },
        { word: 'TOOLOW', score: 0 },
        { word: 'TOOHIGH', score: 101 },
        { word: 'NEGATIVE', score: -5 },
      ]);

      expect(index.has('VALID')).toBe(true);
      expect(index.has('TOOLOW')).toBe(false);
      expect(index.has('TOOHIGH')).toBe(false);
      expect(index.has('NEGATIVE')).toBe(false);
    });

    it('should keep the highest score for duplicate words', () => {
      index.loadFromArray([
        { word: 'WORD', score: 30 },
        { word: 'WORD', score: 80 },
        { word: 'WORD', score: 50 },
      ]);

      expect(index.getScore('WORD')).toBe(80);
    });
  });

  describe('getCandidates', () => {
    beforeEach(() => {
      index.loadFromArray([
        { word: 'ACE', score: 75 },
        { word: 'ACT', score: 80 },
        { word: 'ATE', score: 60 },
        { word: 'BAT', score: 55 },
        { word: 'CAT', score: 70 },
        { word: 'CUT', score: 50 },
        { word: 'BLAST', score: 80 },
        { word: 'BRAVE', score: 75 },
        { word: 'CRANE', score: 70 },
        { word: 'BRAKE', score: 65 },
        { word: 'TRACE', score: 85 },
      ]);
    });

    it('should match a fully wildcard pattern', () => {
      const results = index.getCandidates('...');
      expect(results).toHaveLength(6); // All 3-letter words
      expect(results).toContain('ACE');
      expect(results).toContain('BAT');
    });

    it('should match a pattern with first letter fixed', () => {
      const results = index.getCandidates('A..');
      expect(results).toHaveLength(3); // ACE, ACT, ATE
      expect(results).toContain('ACE');
      expect(results).toContain('ACT');
      expect(results).toContain('ATE');
    });

    it('should match a pattern with last letter fixed', () => {
      const results = index.getCandidates('..T');
      // ACT, BAT, CAT, CUT match ..T
      expect(results).toContain('ACT');
      expect(results).toContain('BAT');
      expect(results).toContain('CAT');
      expect(results.every((w) => w.endsWith('T'))).toBe(true);
    });

    it('should match a pattern with multiple letters fixed', () => {
      const results = index.getCandidates('B....'); // 5-letter B words
      // BLAST, BRAVE, BRAKE all start with B
      expect(results).toContain('BLAST');
      expect(results).toContain('BRAVE');
      expect(results.every((w) => w.startsWith('B') && w.length === 5)).toBe(true);
    });

    it('should match with interior constraint', () => {
      const results = index.getCandidates('.R..E'); // 5-letter, R at 1, E at 4
      // BRAVE, BRAKE, CRANE, TRACE all match
      expect(results).toContain('BRAVE');
      expect(results).toContain('BRAKE');
      expect(results.every((w) => w[1] === 'R' && w[4] === 'E' && w.length === 5)).toBe(true);
    });

    it('should return empty for impossible patterns', () => {
      const results = index.getCandidates('Z....');
      expect(results).toHaveLength(0);
    });

    it('should return empty for lengths with no words', () => {
      const results = index.getCandidates('......'); // 6-letter: none loaded
      expect(results).toHaveLength(0);
    });

    it('should match exact word when all positions are fixed', () => {
      const results = index.getCandidates('ACE');
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('ACE');
    });
  });

  describe('getCandidatesAboveThreshold', () => {
    beforeEach(() => {
      index.loadFromArray([
        { word: 'ACE', score: 75 },
        { word: 'ACT', score: 80 },
        { word: 'ATE', score: 20 },
        { word: 'BAT', score: 55 },
        { word: 'CAT', score: 10 },
      ]);
    });

    it('should filter by minimum score', () => {
      const results = index.getCandidatesAboveThreshold('...', 50);
      expect(results).toContain('ACE');
      expect(results).toContain('ACT');
      expect(results).toContain('BAT');
      expect(results).not.toContain('ATE');
      expect(results).not.toContain('CAT');
    });

    it('should return all with minScore=1', () => {
      const results = index.getCandidatesAboveThreshold('...', 1);
      expect(results).toHaveLength(5);
    });

    it('should return empty if nothing meets threshold', () => {
      const results = index.getCandidatesAboveThreshold('...', 90);
      expect(results).toHaveLength(0);
    });
  });

  describe('getCandidatesSorted', () => {
    beforeEach(() => {
      index.loadFromArray([
        { word: 'ACE', score: 75 },
        { word: 'ACT', score: 80 },
        { word: 'ATE', score: 60 },
      ]);
    });

    it('should return candidates sorted by score descending', () => {
      const results = index.getCandidatesSorted('A..', 1);
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ word: 'ACT', score: 80 });
      expect(results[1]).toEqual({ word: 'ACE', score: 75 });
      expect(results[2]).toEqual({ word: 'ATE', score: 60 });
    });

    it('should respect minScore filter', () => {
      const results = index.getCandidatesSorted('A..', 70);
      expect(results).toHaveLength(2);
      expect(results[0].word).toBe('ACT');
      expect(results[1].word).toBe('ACE');
    });
  });

  describe('countCandidates', () => {
    beforeEach(() => {
      index.loadFromArray([
        { word: 'ACE', score: 75 },
        { word: 'ACT', score: 80 },
        { word: 'ATE', score: 20 },
        { word: 'BAT', score: 55 },
      ]);
    });

    it('should count candidates matching pattern', () => {
      expect(index.countCandidates('A..', 1)).toBe(3);
      expect(index.countCandidates('..T', 1)).toBe(2);
    });

    it('should count with score threshold', () => {
      expect(index.countCandidates('...', 50)).toBe(3);
      expect(index.countCandidates('...', 80)).toBe(1);
    });

    it('should count all words for unconstrained pattern', () => {
      expect(index.countCandidates('...', 1)).toBe(4);
    });
  });

  describe('getScore', () => {
    it('should return score for known words', () => {
      index.loadFromArray([{ word: 'HELLO', score: 65 }]);
      expect(index.getScore('HELLO')).toBe(65);
      expect(index.getScore('hello')).toBe(65); // case insensitive
    });

    it('should return 0 for unknown words', () => {
      index.loadFromArray([{ word: 'HELLO', score: 65 }]);
      expect(index.getScore('MISSING')).toBe(0);
    });
  });

  describe('has', () => {
    it('should check word existence (case insensitive)', () => {
      index.loadFromArray([{ word: 'CRANE', score: 70 }]);
      expect(index.has('CRANE')).toBe(true);
      expect(index.has('crane')).toBe(true);
      expect(index.has('Crane')).toBe(true);
      expect(index.has('MISSING')).toBe(false);
    });
  });

  describe('getWordsByLength', () => {
    it('should group words by length', () => {
      index.loadFromArray([
        { word: 'AT', score: 50 },
        { word: 'ACE', score: 75 },
        { word: 'ACT', score: 80 },
        { word: 'ACES', score: 60 },
        { word: 'BLAST', score: 80 },
      ]);

      expect(index.getWordsByLength(2)).toHaveLength(1);
      expect(index.getWordsByLength(3)).toHaveLength(2);
      expect(index.getWordsByLength(4)).toHaveLength(1);
      expect(index.getWordsByLength(5)).toHaveLength(1);
      expect(index.getWordsByLength(6)).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      index.loadFromArray([
        { word: 'AT', score: 50 },
        { word: 'ACE', score: 75 },
        { word: 'BLAST', score: 80 },
      ]);

      const stats = index.getStats();
      expect(stats.totalWords).toBe(3);
      expect(stats.byLength).toEqual({ 2: 1, 3: 1, 5: 1 });
      expect(stats.loaded).toBe(true);
      expect(stats.averageScore).toBeCloseTo(68.3, 0);
    });
  });

  describe('loadFromDict (master dictionary)', () => {
    it('should load the master dictionary file', () => {
      clearWordIndexCache();
      const masterIndex = getWordIndex();

      const stats = masterIndex.getStats();
      expect(stats.totalWords).toBeGreaterThan(40000);
      expect(stats.loaded).toBe(true);

      // Should have words of length 2-5
      expect(stats.byLength[2]).toBeGreaterThan(0);
      expect(stats.byLength[3]).toBeGreaterThan(0);
      expect(stats.byLength[4]).toBeGreaterThan(0);
      expect(stats.byLength[5]).toBeGreaterThan(0);
    });

    it('should find common crossword words', () => {
      clearWordIndexCache();
      const masterIndex = getWordIndex();

      expect(masterIndex.has('CRANE')).toBe(true);
      expect(masterIndex.has('BLAST')).toBe(true);
      expect(masterIndex.has('ACE')).toBe(true);
      expect(masterIndex.has('THE')).toBe(true);
    });

    it('should perform pattern lookups correctly', () => {
      clearWordIndexCache();
      const masterIndex = getWordIndex();

      const results = masterIndex.getCandidates('CR..E');
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain('CRANE');

      // Verify all results match the pattern
      for (const word of results) {
        expect(word).toHaveLength(5);
        expect(word[0]).toBe('C');
        expect(word[1]).toBe('R');
        expect(word[4]).toBe('E');
      }
    });

    it('should return the singleton instance', () => {
      clearWordIndexCache();
      const instance1 = getWordIndex();
      const instance2 = getWordIndex();
      expect(instance1).toBe(instance2);
    });
  });
});
