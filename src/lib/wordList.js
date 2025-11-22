/**
 * Word List Loader and Matcher
 * Loads word lists from database folder and provides matching functionality
 */

class WordListService {
  constructor() {
    this.wordLists = {
      2: new Set(),
      3: new Set(),
      4: new Set(),
      5: new Set(),
    };
    this.wordFrequencies = new Map(); // word -> frequency score (0-100)
    this.loaded = false;
    this.loading = false;
    this.frequenciesLoaded = false;
    this.loadingFrequencies = false;
  }

  /**
   * Load all word lists from the database folder
   */
  async loadWordLists() {
    if (this.loaded || this.loading) {
      return;
    }

    this.loading = true;

    try {
      // Load all word list files
      const lengths = [2, 3, 4, 5];
      const loadPromises = lengths.map(async (length) => {
        try {
          // Get admin token from localStorage
          const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

          const headers = {
            'Content-Type': 'application/json',
          };

          // Add Authorization header if token exists
          if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
          }

          const response = await fetch(`/api/admin/mini/wordlist?length=${length}`, {
            credentials: 'include',
            headers,
          });

          if (!response.ok) {
            console.error(`[WordList] Failed to load ${length}-letter words: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error(`[WordList] Error response:`, errorText);
            return;
          }

          const text = await response.text();
          const words = text
            .split('\n')
            .map((word) => word.trim().toUpperCase())
            .filter((word) => word.length > 0);
          this.wordLists[length] = new Set(words);
          console.log(`[WordList] Loaded ${words.length} ${length}-letter words`);
        } catch (error) {
          console.error(`[WordList] Failed to load ${length}-letter words:`, error);
        }
      });

      await Promise.all(loadPromises);
      this.loaded = true;
      this.loading = false;
      console.log('[WordList] All word lists loaded');
    } catch (error) {
      console.error('[WordList] Error loading word lists:', error);
      this.loading = false;
    }
  }

  /**
   * Get all words of a specific length
   * @param {number} length - Word length (2-5)
   * @returns {string[]} Array of words
   */
  getWordsByLength(length) {
    return Array.from(this.wordLists[length] || []);
  }

  /**
   * Check if a word is valid
   * @param {string} word - Word to check
   * @returns {boolean} Whether the word is in the dictionary
   */
  isValidWord(word) {
    const upper = word.toUpperCase();
    const length = upper.length;
    return this.wordLists[length]?.has(upper) || false;
  }

  /**
   * Find words matching a pattern
   * Pattern uses '.' for any letter, letters for exact matches
   * Example: "CA.D." matches CARDS, CADDY, etc.
   *
   * @param {string} pattern - Pattern to match (e.g., "CA.D.")
   * @returns {string[]} Matching words
   */
  findMatchingWords(pattern) {
    const length = pattern.length;
    const wordList = this.wordLists[length];

    if (!wordList || wordList.size === 0) {
      return [];
    }

    const upperPattern = pattern.toUpperCase();
    const regex = new RegExp(
      '^' + upperPattern.replace(/\./g, '[A-Z]') + '$'
    );

    return Array.from(wordList).filter((word) => regex.test(word));
  }

  /**
   * Find words matching a pattern with multiple blank positions
   * @param {string} partial - Partial word with known letters (use '' for blanks)
   * @returns {string[]} Matching words
   */
  findWordsForPartial(partial) {
    // Convert partial to pattern ('' becomes '.')
    const pattern = partial.map(char => char || '.').join('');
    return this.findMatchingWords(pattern);
  }

  /**
   * Get word suggestions for grid cell based on intersecting constraints
   * @param {Array<Array<string>>} grid - Current grid state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {string} direction - 'across' or 'down'
   * @returns {Object} { pattern: string, matches: string[] }
   */
  getWordSuggestionsForCell(grid, row, col, direction) {
    const gridSize = grid.length;

    // Find word bounds
    let startRow = row;
    let startCol = col;
    let endRow = row;
    let endCol = col;

    if (direction === 'across') {
      // Find start of word (scan left until black square or edge)
      while (startCol > 0 && grid[row][startCol - 1] !== '■') {
        startCol--;
      }
      // Find end of word (scan right until black square or edge)
      while (endCol < gridSize - 1 && grid[row][endCol + 1] !== '■') {
        endCol++;
      }
    } else {
      // Find start of word (scan up until black square or edge)
      while (startRow > 0 && grid[startRow - 1][col] !== '■') {
        startRow--;
      }
      // Find end of word (scan down until black square or edge)
      while (endRow < gridSize - 1 && grid[endRow + 1][col] !== '■') {
        endRow++;
      }
    }

    // Extract current pattern
    let pattern = [];
    if (direction === 'across') {
      for (let c = startCol; c <= endCol; c++) {
        const cell = grid[row][c];
        pattern.push(cell === '■' ? '■' : (cell || '.'));
      }
    } else {
      for (let r = startRow; r <= endRow; r++) {
        const cell = grid[r][col];
        pattern.push(cell === '■' ? '■' : (cell || '.'));
      }
    }

    // Filter out if this contains black squares (shouldn't happen)
    if (pattern.includes('■')) {
      return { pattern: '', matches: [], position: { start: -1, end: -1 } };
    }

    const patternStr = pattern.join('');
    const matches = this.findMatchingWords(patternStr);

    return {
      pattern: patternStr,
      matches: matches.slice(0, 200), // Limit to 200 suggestions
      position: direction === 'across'
        ? { startRow: row, startCol, endRow: row, endCol }
        : { startRow, startCol: col, endRow, endCol: col }
    };
  }

  /**
   * Find the best word to fill a position based on constraints
   * Used for autofill feature
   * @param {Array<Array<string>>} grid - Current grid
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {string} direction - 'across' or 'down'
   * @returns {string|null} Best matching word or null
   */
  getBestWordForPosition(grid, row, col, direction) {
    const suggestions = this.getWordSuggestionsForCell(grid, row, col, direction);

    if (suggestions.matches.length === 0) {
      return null;
    }

    // For now, return first match (could be enhanced with scoring)
    return suggestions.matches[0];
  }

  /**
   * Load word frequency data from the server
   * @param {number} length - Optional: load only for specific length
   * @returns {Promise<void>}
   */
  async loadWordFrequencies(length = null) {
    if (this.frequenciesLoaded && !length) {
      return; // Already loaded all frequencies
    }

    if (this.loadingFrequencies) {
      return; // Already loading
    }

    this.loadingFrequencies = true;

    try {
      // Get admin token from localStorage
      const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

      const headers = {
        'Content-Type': 'application/json',
      };

      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const url = length
        ? `/api/admin/mini/word-frequencies?length=${length}`
        : '/api/admin/mini/word-frequencies';

      const response = await fetch(url, {
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        console.error(`[WordList] Failed to load word frequencies: ${response.status}`);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Store frequencies in map
        result.data.forEach(({ word, frequency }) => {
          this.wordFrequencies.set(word.toUpperCase(), frequency);
        });

        console.log(`[WordList] Loaded ${result.data.length} word frequencies`);

        if (!length) {
          this.frequenciesLoaded = true;
        }
      }
    } catch (error) {
      console.error('[WordList] Error loading word frequencies:', error);
    } finally {
      this.loadingFrequencies = false;
    }
  }

  /**
   * Get frequency score for a word
   * @param {string} word - Word to check
   * @returns {number} Frequency score (0-100), or 0 if not found
   */
  getWordFrequency(word) {
    return this.wordFrequencies.get(word.toUpperCase()) || 0;
  }

  /**
   * Get words filtered by minimum frequency
   * @param {number} length - Word length
   * @param {number} minFrequency - Minimum frequency threshold (0-100)
   * @returns {string[]} Filtered words
   */
  getWordsByFrequency(length, minFrequency = 0) {
    const allWords = this.getWordsByLength(length);

    if (minFrequency === 0) {
      return allWords;
    }

    return allWords.filter(word => this.getWordFrequency(word) >= minFrequency);
  }

  /**
   * Find words matching a pattern, filtered by frequency
   * @param {string} pattern - Pattern to match
   * @param {number} minFrequency - Minimum frequency threshold (0-100)
   * @returns {string[]} Matching words that meet frequency requirement
   */
  findMatchingWordsWithFrequency(pattern, minFrequency = 0) {
    const matches = this.findMatchingWords(pattern);

    if (minFrequency === 0) {
      return matches;
    }

    return matches.filter(word => this.getWordFrequency(word) >= minFrequency);
  }

  /**
   * Get word suggestions sorted by frequency
   * @param {Array<Array<string>>} grid - Current grid state
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {string} direction - 'across' or 'down'
   * @param {number} minFrequency - Optional minimum frequency filter
   * @returns {Object} Suggestions with frequency scores
   */
  getWordSuggestionsWithFrequency(grid, row, col, direction, minFrequency = 0) {
    const suggestions = this.getWordSuggestionsForCell(grid, row, col, direction);

    // Filter and sort by frequency
    let matches = minFrequency > 0
      ? suggestions.matches.filter(word => this.getWordFrequency(word) >= minFrequency)
      : suggestions.matches;

    // Sort by frequency (descending)
    matches = matches.sort((a, b) => {
      const freqA = this.getWordFrequency(a);
      const freqB = this.getWordFrequency(b);
      return freqB - freqA;
    });

    return {
      ...suggestions,
      matches: matches.slice(0, 200), // Limit to 200
      sorted: true
    };
  }

  /**
   * Calculate average frequency for a set of words
   * @param {string[]} words - Array of words
   * @returns {number} Average frequency score
   */
  calculateAverageFrequency(words) {
    if (words.length === 0) return 0;

    const sum = words.reduce((acc, word) => acc + this.getWordFrequency(word), 0);
    return sum / words.length;
  }
}

// Singleton instance
const wordListService = new WordListService();

export default wordListService;
