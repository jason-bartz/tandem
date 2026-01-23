import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

// Mark as dynamic route (skip for static export/iOS builds)
export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * Extract the word pattern and crossing constraints for a position
 * @param {Array<Array<string>>} grid - The 5x5 grid
 * @param {number} row - Selected row
 * @param {number} col - Selected column
 * @param {string} direction - 'across' or 'down'
 * @returns {Object} - Word pattern info and crossing constraints
 */
function extractWordInfo(grid, row, col, direction) {
  const constraints = [];
  let wordLength = 0;
  let startRow = row;
  let startCol = col;

  if (direction === 'across') {
    // Find start of word
    while (startCol > 0 && grid[row][startCol - 1] !== '■') {
      startCol--;
    }
    // Find end and collect pattern
    let c = startCol;
    while (c < 5 && grid[row][c] !== '■') {
      const letter = grid[row][c];
      const position = c - startCol;

      if (letter && letter !== '' && letter !== '■') {
        constraints.push({ position, letter: letter.toUpperCase() });
      }

      // Check crossing word constraints (down words that cross this position)
      const crossingInfo = getCrossingWordInfo(grid, row, c, 'down');
      if (crossingInfo) {
        constraints.push({
          position,
          crossingWord: crossingInfo,
        });
      }

      wordLength++;
      c++;
    }
  } else {
    // Find start of word
    while (startRow > 0 && grid[startRow - 1][col] !== '■') {
      startRow--;
    }
    // Find end and collect pattern
    let r = startRow;
    while (r < 5 && grid[r][col] !== '■') {
      const letter = grid[r][col];
      const position = r - startRow;

      if (letter && letter !== '' && letter !== '■') {
        constraints.push({ position, letter: letter.toUpperCase() });
      }

      // Check crossing word constraints (across words that cross this position)
      const crossingInfo = getCrossingWordInfo(grid, r, col, 'across');
      if (crossingInfo) {
        constraints.push({
          position,
          crossingWord: crossingInfo,
        });
      }

      wordLength++;
      r++;
    }
  }

  return {
    wordLength,
    startRow,
    startCol,
    constraints,
    pattern: buildPattern(wordLength, constraints),
  };
}

/**
 * Get info about a crossing word at a position
 */
function getCrossingWordInfo(grid, row, col, crossDirection) {
  let startRow = row;
  let startCol = col;
  let word = '';

  if (crossDirection === 'across') {
    // Find start of crossing word
    while (startCol > 0 && grid[row][startCol - 1] !== '■') {
      startCol--;
    }
    // Build crossing word
    let c = startCol;
    while (c < 5 && grid[row][c] !== '■') {
      const letter = grid[row][c];
      word += letter && letter !== '' ? letter.toUpperCase() : '.';
      c++;
    }
    if (word.length < 2) return null;

    return {
      direction: 'across',
      pattern: word,
      crossPosition: col - startCol, // Position in the crossing word where intersection occurs
    };
  } else {
    // Find start of crossing word
    while (startRow > 0 && grid[startRow - 1][col] !== '■') {
      startRow--;
    }
    // Build crossing word
    let r = startRow;
    while (r < 5 && grid[r][col] !== '■') {
      const letter = grid[r][col];
      word += letter && letter !== '' ? letter.toUpperCase() : '.';
      r++;
    }
    if (word.length < 2) return null;

    return {
      direction: 'down',
      pattern: word,
      crossPosition: row - startRow, // Position in the crossing word where intersection occurs
    };
  }
}

/**
 * Build a pattern string from constraints
 * E.g., "A..E." means A at position 0, E at position 3, unknown elsewhere
 */
function buildPattern(length, constraints) {
  const pattern = Array(length).fill('.');
  constraints.forEach((c) => {
    if (c.letter) {
      pattern[c.position] = c.letter;
    }
  });
  return pattern.join('');
}

/**
 * POST /api/admin/mini/suggest
 * Get AI-powered word suggestions for a crossword position
 *
 * Request body:
 * {
 *   grid: Array<Array<string>>,  // The current 5x5 grid
 *   row: number,                  // Selected row
 *   col: number,                  // Selected column
 *   direction: 'across' | 'down'  // Current direction
 * }
 *
 * Response:
 * {
 *   success: true,
 *   suggestions: [
 *     { word: "APPLE", clue: "Common fruit, keeps the doctor away" },
 *     { word: "MAPLE", clue: "Type of tree known for syrup" },
 *     ...
 *   ],
 *   pattern: "A..LE",
 *   wordLength: 5
 * }
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Parse request body
    const body = await request.json();
    const { grid, row, col, direction } = body;

    // Validate input
    if (!grid || !Array.isArray(grid) || grid.length !== 5) {
      return NextResponse.json({ success: false, error: 'Invalid grid format' }, { status: 400 });
    }
    if (typeof row !== 'number' || row < 0 || row > 4) {
      return NextResponse.json({ success: false, error: 'Invalid row' }, { status: 400 });
    }
    if (typeof col !== 'number' || col < 0 || col > 4) {
      return NextResponse.json({ success: false, error: 'Invalid column' }, { status: 400 });
    }
    if (direction !== 'across' && direction !== 'down') {
      return NextResponse.json({ success: false, error: 'Invalid direction' }, { status: 400 });
    }

    // Check if the selected cell is a black square
    if (grid[row][col] === '■') {
      return NextResponse.json(
        { success: false, error: 'Cannot suggest for black square' },
        { status: 400 }
      );
    }

    // Extract word info and constraints
    const wordInfo = extractWordInfo(grid, row, col, direction);

    logger.info('[Suggest API] Generating suggestions', {
      wordLength: wordInfo.wordLength,
      pattern: wordInfo.pattern,
      constraintCount: wordInfo.constraints.length,
    });

    // Check if AI is enabled
    if (!aiService.isEnabled()) {
      logger.error('[Suggest API] AI service is not enabled');
      return NextResponse.json(
        {
          success: false,
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      );
    }

    // Generate suggestions using AI
    const result = await aiService.suggestCrosswordWords({
      wordLength: wordInfo.wordLength,
      pattern: wordInfo.pattern,
      constraints: wordInfo.constraints,
      grid,
      direction,
    });

    const elapsedTime = Date.now() - startTime;

    logger.info('[Suggest API] Suggestions generated', {
      count: result.suggestions.length,
      elapsedTime,
    });

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      pattern: wordInfo.pattern,
      wordLength: wordInfo.wordLength,
      elapsedTime,
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    logger.error('[Suggest API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate suggestions',
        elapsedTime,
      },
      { status: 500 }
    );
  }
}
