import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '@/lib/logger';

/**
 * GET /api/admin/mini/word-frequencies
 *
 * Fetches word frequencies for specified word lengths with optional filtering
 *
 * Query Parameters:
 * - length: Word length (2, 3, 4, or 5) - default: all lengths
 * - threshold: Frequency threshold (0-100) - only return words >= threshold
 * - limit: Maximum number of words to return
 *
 * Returns: Array of {word, frequency} objects sorted by frequency (descending)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const length = searchParams.get('length');
    const threshold = parseInt(searchParams.get('threshold') || '0', 10);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit'), 10) : null;

    const databasePath = path.join(process.cwd(), 'database', 'word_frequencies');
    const allFrequencies = [];

    // Determine which lengths to load
    const lengths = length ? [parseInt(length, 10)] : [2, 3, 4, 5];

    // Load frequency data for each length
    for (const len of lengths) {
      if (len < 2 || len > 5) continue;

      const filePath = path.join(databasePath, `${len}_letter_frequencies.json`);

      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const frequencies = JSON.parse(fileContent);

        // Filter by threshold
        const filtered = frequencies.filter((item) => item.frequency >= threshold);
        allFrequencies.push(...filtered);
      } catch (err) {
        logger.warn(`Could not load frequencies for length ${len}:`, err.message);
      }
    }

    // Sort by frequency (descending) - maintains sort even when combining lengths
    allFrequencies.sort((a, b) => b.frequency - a.frequency);

    // Apply limit if specified
    const result = limit ? allFrequencies.slice(0, limit) : allFrequencies;

    return NextResponse.json(
      {
        success: true,
        count: result.length,
        totalAvailable: allFrequencies.length,
        threshold,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, immutable', // Cache for 24 hours
        },
      }
    );
  } catch (error) {
    logger.error('Error fetching word frequencies:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch word frequencies',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET frequency statistics
 *
 * Returns statistics about word frequency distribution
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { words } = body;

    if (!words || !Array.isArray(words)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: words array required' },
        { status: 400 }
      );
    }

    const databasePath = path.join(process.cwd(), 'database', 'word_frequencies');
    const frequencyMap = new Map();

    // Load all frequency data
    for (let len = 2; len <= 5; len++) {
      const filePath = path.join(databasePath, `${len}_letter_frequencies.json`);

      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const frequencies = JSON.parse(fileContent);

        frequencies.forEach((item) => {
          frequencyMap.set(item.word, item.frequency);
        });
      } catch (err) {
        logger.warn(`Could not load frequencies for length ${len}:`, err.message);
      }
    }

    // Calculate statistics for provided words
    const results = words.map((word) => {
      const upperWord = word.toUpperCase();
      return {
        word: upperWord,
        frequency: frequencyMap.get(upperWord) || 0,
        found: frequencyMap.has(upperWord),
      };
    });

    const foundWords = results.filter((r) => r.found);
    const averageFrequency =
      foundWords.length > 0
        ? foundWords.reduce((sum, r) => sum + r.frequency, 0) / foundWords.length
        : 0;

    return NextResponse.json({
      success: true,
      words: results,
      statistics: {
        totalWords: words.length,
        foundWords: foundWords.length,
        averageFrequency: Math.round(averageFrequency * 100) / 100,
        minFrequency: foundWords.length > 0 ? Math.min(...foundWords.map((r) => r.frequency)) : 0,
        maxFrequency: foundWords.length > 0 ? Math.max(...foundWords.map((r) => r.frequency)) : 0,
      },
    });
  } catch (error) {
    logger.error('Error calculating word statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate statistics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
