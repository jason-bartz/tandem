import { NextResponse } from 'next/server';
import { getPuzzle } from '@/lib/db';
import {
  getCurrentPuzzleNumber,
  getDateForPuzzleNumber,
  getPuzzleNumberForDate,
} from '@/lib/puzzleNumber';
import logger from '@/lib/logger';

/**
 * Archive API - Returns puzzles by number range OR date range
 * Client calculates which puzzle numbers are available based on their timezone
 * Following Wordle's approach for consistent user experience
 *
 * @route GET /api/puzzles/archive
 *
 * Number-based query:
 * @param {number} start - Starting puzzle number (inclusive)
 * @param {number} end - Ending puzzle number (inclusive)
 * @param {number} limit - Maximum puzzles to return (default: 20, max: 50)
 *
 * Date-based query (for calendar view):
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 *
 * @returns {Object} Puzzle list with metadata
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get current puzzle number from user's timezone
    const currentNumber = getCurrentPuzzleNumber();

    // Check if this is a date-based query (for calendar view)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let startNum, endNum, limit;

    if (startDate && endDate) {
      // Date-based query for calendar view
      try {
        startNum = getPuzzleNumberForDate(startDate);
        endNum = getPuzzleNumberForDate(endDate);
        limit = 31; // Max days in a month
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format or date before launch' },
          { status: 400 }
        );
      }
    } else {
      // Number-based query
      startNum = parseInt(searchParams.get('start') || '1');
      endNum = parseInt(searchParams.get('end') || currentNumber.toString());

      // Smart limit defaults:
      // - Default: 31 (max days in a month for calendar views)
      // - Max: 100 (safety cap for non-calendar queries)
      // With month-based queries from ArchiveCalendar, this will always be ≤31
      limit = Math.min(parseInt(searchParams.get('limit') || '31'), 100);
    }

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
