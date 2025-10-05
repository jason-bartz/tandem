import { NextResponse } from 'next/server';
import { setPuzzleForDate, getPuzzlesRange } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { isValidPuzzle } from '@/lib/utils';
import { z } from 'zod';
import { puzzleSchema, sanitizeErrorMessage, escapeHtml } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';

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
    // Apply rate limiting for write operations
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { admin } = authResult;

    // Get the raw body to debug
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);
    const bodyData = JSON.parse(rawBody);
    console.log('Parsed body data:', bodyData);
    console.log('Body data type:', typeof bodyData);
    console.log('Is array?', Array.isArray(bodyData));
    console.log('Has puzzles field?', 'puzzles' in bodyData);
    console.log('Puzzles field type:', typeof bodyData.puzzles, Array.isArray(bodyData.puzzles));

    // Log each puzzle to see the structure
    if (bodyData.puzzles && Array.isArray(bodyData.puzzles)) {
      bodyData.puzzles.forEach((puzzle, index) => {
        console.log(`Puzzle ${index}:`, puzzle);
        if (puzzle.puzzles) {
          puzzle.puzzles.forEach((p, i) => {
            console.log(
              `  Item ${i}: emoji="${p.emoji}", answer="${p.answer}", answer type=${typeof p.answer}`
            );
          });
        }
      });
    }

    // Enhanced bulk import schema with date validation
    const enhancedBulkImportSchema = z.object({
      puzzles: z.array(puzzleSchema).min(1).max(365),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      overwrite: z.boolean().optional().default(false),
    });

    // Validate with the schema
    let validatedData;
    try {
      validatedData = enhancedBulkImportSchema.parse(bodyData);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        console.error('Zod errors:', validationError.errors);
        return NextResponse.json(
          {
            success: false,
            error: `Validation error: ${validationError.errors.map((e) => e.message).join(', ')}`,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    const { startDate, overwrite, puzzles: importedPuzzles } = validatedData;

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

    const existingPuzzles = overwrite
      ? {}
      : await getPuzzlesRange(searchStartDate, searchEndDate.toISOString().split('T')[0]);

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
          requiredCount: importedPuzzles.length,
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
          createdBy: escapeHtml(admin.username),
          createdAt: new Date().toISOString(),
          importedAt: new Date().toISOString(),
        });

        results.push({
          date,
          theme: puzzle.theme,
          success: true,
        });
      } catch (error) {
        console.error(`Failed to save puzzle for ${date}:`, error);
        errors.push({
          date,
          theme: puzzle.theme,
          error: error.message,
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
          end: availableDates[availableDates.length - 1],
        },
      },
    });
  } catch (error) {
    console.error('POST /api/admin/bulk-import error:', error);

    const message = sanitizeErrorMessage(error);

    if (error.message.includes('Validation error') || error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 }
      );
    }

    if (error.message.includes('too large')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import data too large. Please split into smaller batches.',
        },
        { status: 413 }
      );
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
