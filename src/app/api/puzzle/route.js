import { NextResponse } from 'next/server';
import { getPuzzleForDate, incrementStats } from '@/lib/db';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { z } from 'zod';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date');
    const currentInfo = getCurrentPuzzleInfo();
    const date = requestedDate || currentInfo.isoDate;
    
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const validatedDate = dateSchema.parse(date);
    
    const puzzle = await getPuzzleForDate(validatedDate);
    
    // Ensure puzzle has proper structure
    if (puzzle && !puzzle.puzzles && puzzle.emojiPairs && puzzle.words) {
      // Transform old structure to new structure if needed
      puzzle.puzzles = puzzle.emojiPairs.map((emoji, index) => ({
        emoji: emoji,
        answer: puzzle.words[index] || puzzle.correctAnswers[index]
      }));
    }
    
    await incrementStats('views');
    
    // Use puzzle's puzzleNumber if available, otherwise calculate it
    const puzzleNumber = puzzle?.puzzleNumber || 
                        (requestedDate ? null : currentInfo.number);
    
    return NextResponse.json({
      success: true,
      date: validatedDate,
      puzzle: puzzle || null,
      puzzleNumber: puzzleNumber,
      displayDate: requestedDate ? validatedDate : currentInfo.date,
    });
  } catch (error) {
    console.error('GET /api/puzzle error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const completionSchema = z.object({
      completed: z.boolean(),
      time: z.number().min(0),
      mistakes: z.number().min(0).max(4),
    });
    
    const validatedData = completionSchema.parse(body);
    
    await incrementStats('played');
    if (validatedData.completed) {
      await incrementStats('completed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Stats recorded successfully',
    });
  } catch (error) {
    console.error('POST /api/puzzle error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to save stats' },
      { status: 500 }
    );
  }
}