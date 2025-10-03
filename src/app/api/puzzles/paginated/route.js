import { NextResponse } from 'next/server';
import { getPuzzleForDate } from '@/lib/db';
import { z } from 'zod';

/**
 * Paginated puzzle API endpoint
 * Follows iOS best practices for efficient data loading
 * Supports cursor-based pagination for better performance
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50); // Max 50 items
    const sort = searchParams.get('sort') || 'desc'; // 'asc' or 'desc'
    const cursor = searchParams.get('cursor'); // For cursor-based pagination

    // Validate parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Calculate date range based on current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start date is Aug 16, 2024
    const startDate = new Date('2024-08-16T00:00:00');

    // Generate all available dates
    const allDates = [];
    const currentDate = new Date(startDate);

    while (currentDate < today) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      allDates.push(`${year}-${month}-${day}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort dates
    if (sort === 'desc') {
      allDates.reverse();
    }

    // Apply cursor-based pagination if cursor is provided
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allDates.findIndex((date) => date === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1; // Start after the cursor
      }
    } else {
      // Use page-based pagination
      startIndex = (page - 1) * limit;
    }

    // Get the subset of dates for this page
    const paginatedDates = allDates.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allDates.length;
    const nextCursor = hasMore ? paginatedDates[paginatedDates.length - 1] : null;

    // Fetch puzzles for the paginated dates
    const puzzlePromises = paginatedDates.map(async (date) => {
      try {
        const puzzle = await getPuzzleForDate(date);

        // Transform puzzle format if needed
        if (puzzle && !puzzle.puzzles && puzzle.emojiPairs && puzzle.words) {
          puzzle.puzzles = puzzle.emojiPairs.map((emoji, index) => ({
            emoji: emoji,
            answer: puzzle.words[index] || puzzle.correctAnswers[index],
          }));
        }

        return {
          date,
          theme: puzzle?.theme || null,
          puzzleNumber: puzzle?.puzzleNumber || null,
          // Don't send full puzzle data to reduce payload size
          hasData: !!puzzle,
        };
      } catch (error) {
        console.error(`Error fetching puzzle for ${date}:`, error);
        return {
          date,
          theme: null,
          puzzleNumber: null,
          hasData: false,
        };
      }
    });

    const puzzles = await Promise.all(puzzlePromises);

    // Generate ETag for caching
    const etag = `"${page}-${limit}-${sort}-${puzzles.length}"`;

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

    // Return paginated response
    const response = NextResponse.json({
      success: true,
      puzzles,
      pagination: {
        page,
        limit,
        total: allDates.length,
        totalPages: Math.ceil(allDates.length / limit),
        hasMore,
        nextCursor,
        currentCount: puzzles.length,
      },
      meta: {
        sort,
        cacheKey: etag,
      },
    });

    // Set caching headers
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=300'); // 5 minutes

    return response;
  } catch (error) {
    console.error('GET /api/puzzles/paginated error:', error);

    return NextResponse.json({ success: false, error: 'Failed to fetch puzzles' }, { status: 500 });
  }
}

/**
 * Fetch specific puzzle details
 * Used when user selects a puzzle from the list
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const requestSchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    const { date } = requestSchema.parse(body);

    const puzzle = await getPuzzleForDate(date);

    if (!puzzle) {
      return NextResponse.json({ success: false, error: 'Puzzle not found' }, { status: 404 });
    }

    // Transform puzzle format if needed
    if (!puzzle.puzzles && puzzle.emojiPairs && puzzle.words) {
      puzzle.puzzles = puzzle.emojiPairs.map((emoji, index) => ({
        emoji: emoji,
        answer: puzzle.words[index] || puzzle.correctAnswers[index],
      }));
    }

    return NextResponse.json({
      success: true,
      puzzle,
      date,
    });
  } catch (error) {
    console.error('POST /api/puzzles/paginated error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to fetch puzzle' }, { status: 500 });
  }
}
