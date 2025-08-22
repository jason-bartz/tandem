import { NextResponse } from 'next/server';
import { setPuzzleForDate, getPuzzlesRange } from '@/lib/db';
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

function getNextAvailableDates(startDate, count, existingPuzzles) {
  const availableDates = [];
  const currentDate = new Date(startDate);
  
  while (availableDates.length < count) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    if (!existingPuzzles[dateStr]) {
      availableDates.push(dateStr);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return availableDates;
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
    
    const bulkImportSchema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      overwrite: z.boolean().optional().default(false),
      puzzles: z.array(
        z.object({
          theme: z.string().min(3).max(50),
          puzzles: z.array(
            z.object({
              emoji: z.string().min(1).max(10),
              answer: z.string().min(2).max(30).transform(s => s.toUpperCase())
            })
          ).length(4)
        })
      ).min(1)
    });
    
    const { startDate, overwrite, puzzles: importedPuzzles } = bulkImportSchema.parse(body);
    
    for (const puzzle of importedPuzzles) {
      if (!isValidPuzzle(puzzle)) {
        return NextResponse.json(
          { success: false, error: 'Invalid puzzle structure in imported data' },
          { status: 400 }
        );
      }
    }
    
    const searchStartDate = startDate || new Date().toISOString().split('T')[0];
    const searchEndDate = new Date(searchStartDate);
    searchEndDate.setFullYear(searchEndDate.getFullYear() + 1);
    
    const existingPuzzles = overwrite ? {} : await getPuzzlesRange(
      searchStartDate,
      searchEndDate.toISOString().split('T')[0]
    );
    
    const availableDates = overwrite 
      ? Array.from({ length: importedPuzzles.length }, (_, i) => {
          const date = new Date(searchStartDate);
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        })
      : getNextAvailableDates(searchStartDate, importedPuzzles.length, existingPuzzles);
    
    if (availableDates.length < importedPuzzles.length) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not enough available dates for all puzzles',
          availableCount: availableDates.length,
          requiredCount: importedPuzzles.length
        },
        { status: 400 }
      );
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < importedPuzzles.length; i++) {
      const date = availableDates[i];
      const puzzle = importedPuzzles[i];
      
      try {
        await setPuzzleForDate(date, {
          ...puzzle,
          createdBy: admin.username,
          createdAt: new Date().toISOString(),
          importedAt: new Date().toISOString()
        });
        
        results.push({
          date,
          theme: puzzle.theme,
          success: true
        });
      } catch (error) {
        console.error(`Failed to save puzzle for ${date}:`, error);
        errors.push({
          date,
          theme: puzzle.theme,
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: errors.length === 0,
      message: `Imported ${results.length} puzzles successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      imported: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: importedPuzzles.length,
        successful: results.length,
        failed: errors.length,
        dateRange: {
          start: availableDates[0],
          end: availableDates[availableDates.length - 1]
        }
      }
    });
  } catch (error) {
    console.error('POST /api/admin/bulk-import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid import data format',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to import puzzles' },
      { status: 500 }
    );
  }
}