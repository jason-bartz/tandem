/**
 * Enhanced Trie-based data structure for efficient crossword puzzle generation
 * Includes pattern caching and word frequency support for optimized generation
 * Adapted from prefix tree algorithm with performance enhancements
 */

import logger from '@/lib/logger';

export class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.words = []; // Store all words that pass through this node
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
    this.allWords = []; // Flat list of all words for random selection
    this.wordFrequencies = new Map(); // Map of word -> frequency score (0-100)
    this.patternCache = new Map(); // Cache for pattern search results
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalSearches: 0,
    };
  }

  /**
   * Insert a word into the Trie
   * @param {string} word - The word to insert (will be uppercased)
   */
  insert(word) {
    const upperWord = word.toUpperCase().trim();

    if (!upperWord || !/^[A-Z]+$/.test(upperWord)) {
      return; // Skip invalid words
    }

    let node = this.root;

    // Build path for this word, storing it at each node
    for (const char of upperWord) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.words.push(upperWord);
    }

    node.isEndOfWord = true;

    // Add to flat list for random selection
    if (!this.allWords.includes(upperWord)) {
      this.allWords.push(upperWord);
    }
  }

  /**
   * Search for all words matching a given prefix
   * @param {string} prefix - The prefix to search for
   * @returns {string[]} Array of words that start with the prefix
   */
  searchByPrefix(prefix) {
    const upperPrefix = prefix.toUpperCase();
    let node = this.root;

    // Navigate to the prefix node
    for (const char of upperPrefix) {
      if (!node.children[char]) {
        return []; // Prefix not found
      }
      node = node.children[char];
    }

    return node.words || [];
  }

  /**
   * Search for words matching a pattern with wildcards (UNCACHED)
   * Pattern uses '.' or ' ' for unknown letters
   * Example: "C.R.S" matches "CARDS", "CARTS", "CURLS", etc.
   *
   * @param {string} pattern - Pattern with '.' or ' ' as wildcards
   * @returns {string[]} Array of matching words
   */
  searchByPattern(pattern) {
    const upperPattern = pattern.toUpperCase();
    const length = upperPattern.length;

    // Get all words of matching length
    const candidates = this.getWordsByLength(length);

    // Filter by pattern
    const regex = new RegExp('^' + upperPattern.replace(/[\.\s]/g, '[A-Z]') + '$');

    return candidates.filter((word) => regex.test(word));
  }

  /**
   * Search for words matching a pattern with caching (RECOMMENDED)
   * Uses Map-based cache to avoid redundant pattern matching
   * Significantly improves performance during backtracking
   *
   * @param {string} pattern - Pattern with '.' or ' ' as wildcards
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {string[]} Array of matching words
   */
  searchByPatternCached(pattern, useCache = true) {
    const upperPattern = pattern.toUpperCase();
    this.cacheStats.totalSearches++;

    // Check cache first
    if (useCache && this.patternCache.has(upperPattern)) {
      this.cacheStats.hits++;
      return this.patternCache.get(upperPattern);
    }

    this.cacheStats.misses++;

    // Perform actual search
    const results = this.searchByPattern(upperPattern);

    // Cache the result
    if (useCache) {
      this.patternCache.set(upperPattern, results);
    }

    return results;
  }

  /**
   * Get all words of a specific length
   * @param {number} length - Word length (2-5)
   * @returns {string[]} Array of words with specified length
   */
  getWordsByLength(length) {
    return this.allWords.filter((word) => word.length === length);
  }

  /**
   * Check if a word exists in the Trie
   * @param {string} word - Word to check
   * @returns {boolean}
   */
  has(word) {
    const upperWord = word.toUpperCase();
    let node = this.root;

    for (const char of upperWord) {
      if (!node.children[char]) {
        return false;
      }
      node = node.children[char];
    }

    return node.isEndOfWord;
  }

  /**
   * Get a random word of specified length
   * @param {number} length - Word length
   * @returns {string|null} Random word or null if none found
   */
  getRandomWord(length) {
    const words = this.getWordsByLength(length);

    if (words.length === 0) {
      return null;
    }

    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * Set frequency score for a word
   * @param {string} word - Word to set frequency for
   * @param {number} frequency - Frequency score (0-100)
   */
  setWordFrequency(word, frequency) {
    const upperWord = word.toUpperCase();
    this.wordFrequencies.set(upperWord, frequency);
  }

  /**
   * Get frequency score for a word
   * @param {string} word - Word to get frequency for
   * @returns {number} Frequency score (0-100), or 0 if not found
   */
  getWordFrequency(word) {
    const upperWord = word.toUpperCase();
    return this.wordFrequencies.get(upperWord) || 0;
  }

  /**
   * Load frequency data into the Trie
   * @param {Array<{word: string, frequency: number}>} frequencyData - Array of word frequency objects
   */
  loadFrequencies(frequencyData) {
    frequencyData.forEach(({ word, frequency }) => {
      this.setWordFrequency(word, frequency);
    });
  }

  /**
   * Get words filtered by minimum frequency threshold
   * @param {number} minFrequency - Minimum frequency score (0-100)
   * @param {number} length - Optional: filter by word length
   * @returns {string[]} Array of words meeting frequency threshold
   */
  getWordsByFrequency(minFrequency = 0, length = null) {
    const words = length ? this.getWordsByLength(length) : this.allWords;

    if (minFrequency === 0) {
      return words; // No filtering needed
    }

    return words.filter((word) => this.getWordFrequency(word) >= minFrequency);
  }

  /**
   * Search for words matching a pattern, filtered by frequency
   * Uses caching for performance
   *
   * @param {string} pattern - Pattern with '.' or ' ' as wildcards
   * @param {number} minFrequency - Minimum frequency threshold (0-100)
   * @returns {string[]} Array of matching words that meet frequency requirement
   */
  searchByPatternWithFrequency(pattern, minFrequency = 0) {
    // Create cache key that includes frequency threshold
    const cacheKey = `${pattern.toUpperCase()}:f${minFrequency}`;
    this.cacheStats.totalSearches++;

    // Check cache
    if (this.patternCache.has(cacheKey)) {
      this.cacheStats.hits++;
      return this.patternCache.get(cacheKey);
    }

    this.cacheStats.misses++;

    // Get pattern matches
    const matches = this.searchByPattern(pattern);

    // Filter by frequency
    const filtered =
      minFrequency > 0
        ? matches.filter((word) => this.getWordFrequency(word) >= minFrequency)
        : matches;

    // Cache the result
    this.patternCache.set(cacheKey, filtered);

    return filtered;
  }

  /**
   * Clear the pattern cache (useful for memory management)
   */
  clearCache() {
    this.patternCache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalSearches: 0,
    };
  }

  /**
   * Get cache hit rate percentage
   * @returns {number} Hit rate as percentage (0-100)
   */
  getCacheHitRate() {
    if (this.cacheStats.totalSearches === 0) return 0;
    return (this.cacheStats.hits / this.cacheStats.totalSearches) * 100;
  }

  /**
   * Get statistics about the Trie
   * @returns {object} Stats object
   */
  getStats() {
    const stats = {
      totalWords: this.allWords.length,
      wordsWithFrequency: this.wordFrequencies.size,
      byLength: {},
      cacheStats: {
        ...this.cacheStats,
        hitRate: this.getCacheHitRate().toFixed(2) + '%',
        cacheSize: this.patternCache.size,
      },
    };

    for (let len = 2; len <= 5; len++) {
      stats.byLength[len] = this.getWordsByLength(len).length;
    }

    return stats;
  }
}

/**
 * Loads word lists from file system and builds a Trie
 * Optionally loads word frequency data for difficulty control
 *
 * @param {string} databasePath - Path to database folder with word list files
 * @param {boolean} loadFrequencies - Whether to load frequency data (default: true)
 * @returns {Promise<Trie>} Populated Trie instance
 */
export async function buildTrieFromFiles(databasePath, loadFrequencies = true) {
  const fs = await import('fs').then((m) => m.promises);
  const path = await import('path').then((m) => m.default);
  const trie = new Trie();

  const wordLengths = [2, 3, 4, 5];

  // Load word lists
  for (const length of wordLengths) {
    const filePath = path.join(databasePath, `${length}_letter_words.txt`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const words = content
        .split('\n')
        .map((w) => w.trim())
        .filter((w) => w.length === length);

      words.forEach((word) => trie.insert(word));

      logger.info(`Loaded ${words.length} words of length ${length}`);
    } catch (error) {
      logger.error(`Error loading ${length}-letter words:`, error.message);
    }
  }

  // Load frequency data
  if (loadFrequencies) {
    const frequencyPath = path.join(databasePath, 'word_frequencies');

    for (const length of wordLengths) {
      const freqFilePath = path.join(frequencyPath, `${length}_letter_frequencies.json`);

      try {
        const content = await fs.readFile(freqFilePath, 'utf-8');
        const frequencyData = JSON.parse(content);

        trie.loadFrequencies(frequencyData);

        logger.info(`Loaded ${frequencyData.length} frequency scores for ${length}-letter words`);
      } catch (error) {
        logger.warn(`Could not load frequencies for ${length}-letter words:`, error.message);
      }
    }
  }

  return trie;
}
