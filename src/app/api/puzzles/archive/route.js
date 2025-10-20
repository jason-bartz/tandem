import { NextResponse } from 'next/server';
import { getPuzzle } from '@/lib/db';
import { getCurrentPuzzleNumber, getDateForPuzzleNumber } from '@/lib/puzzleNumber';
import logger from '@/lib/logger';

/**
 * Archive API - Returns puzzles by number range
 * Client calculates which puzzle numbers are available based on their timezone
 * Following Wordle's approach for consistent user experience
 *
 * @route GET /api/puzzles/archive
 * @param {number} start - Starting puzzle number (inclusive)
 * @param {number} end - Ending puzzle number (inclusive)
 * @param {number} limit - Maximum puzzles to return (default: 20, max: 50)
 * @returns {Object} Puzzle list with metadata
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get current puzzle number from user's timezone
    const currentNumber = getCurrentPuzzleNumber();

    // Parse parameters with defaults
    const startNum = parseInt(searchParams.get('start') || '1');
    const endNum = parseInt(searchParams.get('end') || currentNumber.toString());
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 for performance

    // Validate range
    if (startNum < 1) {
      return NextResponse.json(
        { success: false, error: 'Start number must be at least 1' },
        { status: 400 }
      );
    }

    if (endNum > currentNumber) {
      return NextResponse.json(
        {
          success: false,
          error: `Puzzle ${endNum} is not available yet. Current puzzle is ${currentNumber}`,
        },
        { status: 400 }
      );
    }

    if (startNum > endNum) {
      return NextResponse.json(
        { success: false, error: 'Start number cannot be greater than end number' },
        { status: 400 }
      );
    }

    // Generate puzzle numbers in descending order (newest first)
    const numbers = [];
    for (let i = Math.min(endNum, currentNumber); i >= startNum && numbers.length < limit; i--) {
      numbers.push(i);
    }

    // Fetch puzzle metadata in parallel for performance
    const puzzlePromises = numbers.map(async (num) => {
      try {
        const puzzle = await getPuzzle(num);
        const date = getDateForPuzzleNumber(num);

        return {
          number: num,
          date: date,
          theme: puzzle?.theme || null,
          hasData: !!puzzle,
          // Don't send full puzzle data to reduce payload
        };
      } catch (error) {
        logger.error(`Error fetching puzzle ${num}`, error);
        return {
          number: num,
          date: null,
          theme: null,
          hasData: false,
        };
      }
    });

    const puzzles = await Promise.all(puzzlePromises);

    // Calculate pagination info
    const totalAvailable = currentNumber;
    // hasMore is true if there are older puzzles (startNum > 1)
    const hasMore = startNum > 1;

    // Generate ETag for caching
    const etag = `"archive-${startNum}-${endNum}-${limit}-${currentNumber}"`;

    // Check if client has cached version
    const clientEtag = request.headers.get('if-none-match');
    if (clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      puzzles,
      pagination: {
        start: startNum,
        end: endNum,
        limit,
        total: totalAvailable,
        returned: puzzles.length,
        hasMore,
        currentPuzzle: currentNumber,
      },
      meta: {
        cacheKey: etag,
        timestamp: new Date().toISOString(),
      },
    });

    // Set caching headers for performance
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=300'); // 5 minutes
    response.headers.set('Vary', 'Accept-Encoding'); // Support compression

    return response;
  } catch (error) {
    logger.error('Archive API error', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch archive puzzles' },
      { status: 500 }
    );
  }
}
