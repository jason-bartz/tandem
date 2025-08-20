import { NextResponse } from 'next/server';
import { getPuzzleForDate, incrementStats } from '@/lib/db';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { z } from 'zod';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getCurrentPuzzleInfo().isoDate;
    
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const validatedDate = dateSchema.parse(date);
    
    const puzzle = await getPuzzleForDate(validatedDate);
    const puzzleInfo = getCurrentPuzzleInfo();
    
    await incrementStats('views');
    
    return NextResponse.json({
      success: true,
      date: validatedDate,
      puzzle: puzzle || null,
      puzzleNumber: puzzleInfo.number,
      displayDate: puzzleInfo.date,
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