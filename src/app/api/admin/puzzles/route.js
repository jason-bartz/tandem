import { NextResponse } from 'next/server';
import { 
  getPuzzlesRange, 
  setPuzzleForDate, 
  deletePuzzleForDate 
} from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';
import { isValidPuzzle } from '@/lib/utils';
import { z } from 'zod';

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return verifyAdminToken(token);
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    const dateRangeSchema = z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    
    const { start: validStart, end: validEnd } = dateRangeSchema.parse({ start, end });
    
    const puzzles = await getPuzzlesRange(validStart, validEnd);
    
    return NextResponse.json({
      success: true,
      puzzles,
      count: Object.keys(puzzles).length,
    });
  } catch (error) {
    console.error('GET /api/admin/puzzles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid date range' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzles' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const puzzleSchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      puzzle: z.object({
        theme: z.string().min(3).max(50),
        puzzles: z.array(
          z.object({
            emoji: z.string().min(1).max(10), // Allow emoji pairs
            answer: z.string().min(2).max(15).regex(/^[A-Z\s]+$/), // Allow longer answers
          })
        ).length(4),
      }),
    });
    
    const { date, puzzle } = puzzleSchema.parse(body);
    
    if (!isValidPuzzle(puzzle)) {
      return NextResponse.json(
        { success: false, error: 'Invalid puzzle structure' },
        { status: 400 }
      );
    }
    
    await setPuzzleForDate(date, {
      ...puzzle,
      createdBy: admin.username,
      createdAt: new Date().toISOString(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Puzzle saved for ${date}`,
      date,
    });
  } catch (error) {
    console.error('POST /api/admin/puzzles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid puzzle data',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to save puzzle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const validatedDate = dateSchema.parse(date);
    
    await deletePuzzleForDate(validatedDate);
    
    return NextResponse.json({
      success: true,
      message: `Puzzle deleted for ${validatedDate}`,
    });
  } catch (error) {
    console.error('DELETE /api/admin/puzzles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete puzzle' },
      { status: 500 }
    );
  }
}