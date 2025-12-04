import { NextResponse } from 'next/server';
import path from 'path';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import { buildTrieFromFiles } from '@/lib/server/TrieGenerator.js';
import CrosswordGenerator from '@/lib/server/CrosswordGenerator.js';
import { createServerClient } from '@/lib/supabase/server';
import { extractWordsFromPuzzles } from '@/lib/miniUtils';

// Default lookback period for word deduplication (in days)
const DEDUP_LOOKBACK_DAYS = 45;

// Mark as dynamic route
export const dynamic = 'force-dynamic';

// Cache the Trie in memory for performance
let cachedTrie = null;
let trieLoadPromise = null;

/**
 * Generate clue numbers for a crossword grid
 * @param {Array<Array<string>>} grid - The solution grid
 * @returns {Array<Array<number>>} Grid with clue numbers
 */
function generateClueNumbers(grid) {
  const numbers = Array(5)
    .fill(null)
    .map(() => Array(5).fill(0));
  const BLACK_SQUARE = '■';
  let currentNumber = 1;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] === BLACK_SQUARE) {
        continue;
      }

      // Check if this cell starts an across word
      const startsAcross =
        (col === 0 || grid[row][col - 1] === BLACK_SQUARE) &&
        col < 4 &&
        grid[row][col + 1] !== BLACK_SQUARE;

      // Check if this cell starts a down word
      const startsDown =
        (row === 0 || grid[row - 1][col] === BLACK_SQUARE) &&
        row < 4 &&
        grid[row + 1][col] !== BLACK_SQUARE;

      if (startsAcross || startsDown) {
        numbers[row][col] = currentNumber;
        currentNumber++;
      }
    }
  }

  return numbers;
}

/**
 * Fetch words from recent mini puzzles to exclude from generation
 * This prevents repetition of words across puzzles
 */
async function getRecentlyUsedWords(lookbackDays = DEDUP_LOOKBACK_DAYS) {
  try {
    const supabase = createServerClient();

    // Calculate the start date for lookback period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(
      `[Generator API] Fetching words from puzzles since ${startDateStr} (${lookbackDays} days)`
    );

    // Fetch recent puzzles
    const { data: puzzles, error } = await supabase
      .from('mini_puzzles')
      .select('solution')
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      console.error('[Generator API] Error fetching recent puzzles:', error);
      return [];
    }

    // Extract all words from these puzzles
    const words = extractWordsFromPuzzles(puzzles);

    console.log(
      `[Generator API] Found ${words.length} unique words from ${puzzles.length} recent puzzles`
    );

    return words;
  } catch (error) {
    console.error('[Generator API] Error in getRecentlyUsedWords:', error);
    return [];
  }
}

/**
 * Load and cache the Trie with word frequencies
 */
async function getTrie() {
  // If already cached, return it
  if (cachedTrie) {
    console.log('[Generator API] Using cached Trie');
    return cachedTrie;
  }

  // If currently loading, wait for that promise
  if (trieLoadPromise) {
    console.log('[Generator API] Waiting for Trie to finish loading...');
    return await trieLoadPromise;
  }

  // Start loading
  trieLoadPromise = (async () => {
    console.log('[Generator API] Building Trie from word lists with frequencies...');
    const startTime = Date.now();
    const databasePath = path.join(process.cwd(), 'database');

    // Load Trie with frequency data
    cachedTrie = await buildTrieFromFiles(databasePath, true); // true = load frequencies

    const stats = cachedTrie.getStats();
    const duration = Date.now() - startTime;
    console.log(`[Generator API] Trie built successfully in ${duration}ms:`, stats);

    return cachedTrie;
  })();

  return await trieLoadPromise;
}

/**
 * POST /api/admin/mini/generate
 * Generate a crossword puzzle using enhanced two-level heuristic algorithm
 *
 * Request body:
 * {
 *   mode: 'scratch' | 'fill',      // Generate from scratch or fill existing pattern
 *   existingGrid?: Array<Array>,    // Required if mode='fill'
 *   symmetry?: string,              // 'none', 'rotational', 'horizontal', 'vertical'
 *   maxRetries?: number,            // Max attempts (default: 100)
 *   minFrequency?: number,          // Minimum word frequency threshold (0-100, default: 0)
 *   difficulty?: string             // 'easy' (70), 'medium' (40), 'hard' (20), 'expert' (0)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   grid: Array<Array>,             // Grid with black squares only
 *   solution: Array<Array>,         // Complete solution grid
 *   words: [{word, direction, startRow, startCol}],
 *   stats: {                        // Generation statistics
 *     totalAttempts, backtrackCount, slotsFilled,
 *     elapsedTime, cacheHitRate, cacheSize
 *   }
 * }
 */
export async function POST(request) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Parse request body
    const body = await request.json();
    const {
      mode = 'scratch',
      existingGrid = null,
      symmetry = 'none',
      maxRetries = 100,
      difficulty = null,
      minFrequency = null,
    } = body;

    // Convert difficulty to minFrequency if provided
    let actualMinFrequency = minFrequency;
    if (difficulty && minFrequency === null) {
      const difficultyMap = {
        easy: 40, // Top 60% most common words
        medium: 25, // Top 75% most common words
        hard: 10, // Top 90% most common words
        expert: 0, // All words
      };
      actualMinFrequency = difficultyMap[difficulty] || 0;
    } else if (actualMinFrequency === null) {
      actualMinFrequency = 0; // Default: use all words
    }

    // Validate mode
    if (!['scratch', 'fill'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "scratch" or "fill"' },
        { status: 400 }
      );
    }

    // Validate existing grid for fill mode
    if (mode === 'fill' && !existingGrid) {
      return NextResponse.json(
        { error: 'existingGrid required when mode is "fill"' },
        { status: 400 }
      );
    }

    // Validate symmetry
    const validSymmetries = [
      'none',
      'rotational',
      'horizontal',
      'vertical',
      'diagonal-ne-sw',
      'diagonal-nw-se',
    ];
    if (!validSymmetries.includes(symmetry)) {
      return NextResponse.json(
        { error: `Invalid symmetry. Must be one of: ${validSymmetries.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(
      `[Generator API] Starting generation - mode: ${mode}, symmetry: ${symmetry}, minFrequency: ${actualMinFrequency}`
    );

    // Load Trie (cached after first load)
    console.log('[Generator API] Step 1: Loading Trie with frequencies...');
    const trie = await getTrie();

    // Clear pattern cache for fresh generation
    trie.clearCache();
    console.log('[Generator API] Step 1: Trie loaded ✓');

    // Fetch recently used words to exclude from generation
    console.log('[Generator API] Step 1.5: Fetching recently used words...');
    const excludeWords = await getRecentlyUsedWords();
    console.log(
      `[Generator API] Step 1.5: Will exclude ${excludeWords.length} recently used words ✓`
    );

    // Create generator instance with frequency threshold and word exclusion
    console.log('[Generator API] Step 2: Creating generator instance...');
    const generator = new CrosswordGenerator(trie, {
      maxRetries,
      minFrequency: actualMinFrequency,
      excludeWords,
    });
    console.log('[Generator API] Step 2: Generator created ✓');

    // Generate puzzle
    console.log('[Generator API] Step 3: Generating puzzle...');
    const result = generator.generate(mode, existingGrid, symmetry);

    console.log(
      `[Generator API] Step 3: Generation successful - ${result.words.length} words placed ✓`
    );
    console.log(`[Generator API] Stats:`, result.stats);

    // Generate AI clues for all words
    const clues = { across: [], down: [] };

    try {
      if (aiService.isEnabled()) {
        console.log('[Generator API] Generating AI clues...');

        const generatedClues = await aiService.generateCrosswordClues(result.words);

        // Format clues into across/down structure with numbering
        const clueNumbers = generateClueNumbers(result.solution);
        let clueIndex = 0;

        for (const wordInfo of result.words) {
          const { word, direction, startRow, startCol } = wordInfo;
          const clueNumber = clueNumbers[startRow][startCol];

          if (clueNumber > 0) {
            const clue = {
              number: clueNumber,
              clue: generatedClues[clueIndex] || `Clue for ${word}`,
              answer: word,
              row: startRow,
              col: startCol,
              length: word.length,
            };

            if (direction === 'across') {
              clues.across.push(clue);
            } else {
              clues.down.push(clue);
            }

            clueIndex++;
          }
        }

        // Sort clues by number
        clues.across.sort((a, b) => a.number - b.number);
        clues.down.sort((a, b) => b.number - b.number);

        console.log(`[Generator API] AI clues generated - ${clueIndex} clues`);
      } else {
        console.log('[Generator API] AI disabled, skipping clue generation');
      }
    } catch (error) {
      console.error('[Generator API] AI clue generation failed:', error);
      // Continue without AI clues - return puzzle anyway
    }

    return NextResponse.json({
      success: true,
      grid: result.grid,
      solution: result.solution,
      words: result.words,
      clues,
      stats: {
        ...result.stats,
        excludedWordsCount: excludeWords.length,
      },
      difficulty: difficulty || 'custom',
      minFrequency: actualMinFrequency,
    });
  } catch (error) {
    console.error('[Generator API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate puzzle',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/mini/generate/status
 * Check if Trie is loaded and ready
 */
export async function GET(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const isLoaded = cachedTrie !== null;
    const stats = isLoaded ? cachedTrie.getStats() : null;

    return NextResponse.json({
      loaded: isLoaded,
      stats,
    });
  } catch (error) {
    console.error('[Generator API] Status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
