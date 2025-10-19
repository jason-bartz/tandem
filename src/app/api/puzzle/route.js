import { NextResponse } from 'next/server';
import {
  getPuzzle,
  incrementStats,
  updatePuzzleStats,
  trackUniquePlayer,
  updateDailyStats,
} from '@/lib/db';
import { getCurrentPuzzleNumber, getDateForPuzzleNumber } from '@/lib/puzzleNumber';
import { z } from 'zod';
import crypto from 'crypto';
import logger from '@/lib/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date');
    const requestedNumber = searchParams.get('number');

    let identifier;
    let puzzleNumber;
    let date;

    if (requestedNumber) {
      // Support puzzle number parameter (new system)
      const numberSchema = z.string().regex(/^\d+$/);
      const validatedNumber = numberSchema.parse(requestedNumber);
      puzzleNumber = parseInt(validatedNumber);
      identifier = puzzleNumber;
      date = getDateForPuzzleNumber(puzzleNumber);
    } else if (requestedDate) {
      // Support date parameter (backward compatibility)
      const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      date = dateSchema.parse(requestedDate);
      identifier = date;
    } else {
      // Default to current puzzle (user's timezone)
      puzzleNumber = getCurrentPuzzleNumber();
      identifier = puzzleNumber;
      date = getDateForPuzzleNumber(puzzleNumber);
    }

    // Get puzzle using unified function
    const puzzle = await getPuzzle(identifier);

    // Ensure puzzle has proper structure
    if (puzzle && !puzzle.puzzles && puzzle.emojiPairs && puzzle.words) {
      // Transform old structure to new structure if needed
      puzzle.puzzles = puzzle.emojiPairs.map((emoji, index) => ({
        emoji: emoji,
        answer: puzzle.words[index] || puzzle.correctAnswers[index],
      }));
    }

    await incrementStats('views');

    // Track unique player via session ID
    const sessionId =
      request.headers.get('x-session-id') ||
      request.headers.get('x-forwarded-for') ||
      crypto.randomBytes(16).toString('hex');
    await trackUniquePlayer(sessionId);

    return NextResponse.json({
      success: true,
      puzzle: puzzle || null,
      puzzleNumber: puzzle?.puzzleNumber || puzzleNumber,
      date: puzzle?.date || date,
    });
  } catch (error) {
    logger.error('GET /api/puzzle error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Use ?date=YYYY-MM-DD or ?number=N' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to fetch puzzle' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const completionSchema = z.object({
      completed: z.boolean(),
      time: z.number().min(0),
      mistakes: z.number().min(0).max(4),
      hintsUsed: z.number().min(0).max(2).optional(), // Updated to support 0-2 hints
      hintedAnswers: z.array(z.number()).optional(), // Track which answers got hints
    });

    const validatedData = completionSchema.parse(body);

    // Support both date and puzzle number for stats tracking
    let puzzleDate;
    if (body.puzzleNumber) {
      puzzleDate = getDateForPuzzleNumber(body.puzzleNumber);
    } else if (body.date) {
      puzzleDate = body.date;
    } else {
      // Default to current puzzle in user's timezone
      const currentNumber = getCurrentPuzzleNumber();
      puzzleDate = getDateForPuzzleNumber(currentNumber);
    }

    const sessionId =
      request.headers.get('x-session-id') ||
      request.headers.get('x-forwarded-for') ||
      crypto.randomBytes(16).toString('hex');

    // Update global stats
    await incrementStats('played');
    if (validatedData.completed) {
      await incrementStats('completed');
      if (validatedData.mistakes === 0) {
        await incrementStats('perfectGames');
      }
    }
    if (validatedData.time) {
      await incrementStats('totalTime');
    }

    // Update puzzle-specific stats
    await updatePuzzleStats(puzzleDate, {
      played: true,
      completed: validatedData.completed,
      time: validatedData.time,
      mistakes: validatedData.mistakes,
      hintsUsed: body.hintsUsed || 0,
      shared: body.shared || false,
    });

    // Update daily stats
    await updateDailyStats('plays');
    if (validatedData.completed) {
      await updateDailyStats('completions');
    }

    // Track unique player
    await trackUniquePlayer(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Stats recorded successfully',
    });
  } catch (error) {
    logger.error('POST /api/puzzle error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to save stats' }, { status: 500 });
  }
}
