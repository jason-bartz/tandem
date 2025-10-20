import { NextResponse } from 'next/server';
import { getPuzzlesRange, setPuzzleForDate, deletePuzzleForDate } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { isValidPuzzle } from '@/lib/utils';
import {
  dateRangeSchema,
  dateSchema,
  puzzleWithDateSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
  escapeHtml,
} from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const { start: validStart, end: validEnd } = dateRangeSchema.parse({ start, end });

    const puzzles = await getPuzzlesRange(validStart, validEnd);

    return NextResponse.json({
      success: true,
      puzzles,
      count: Object.keys(puzzles).length,
    });
  } catch (error) {
    logger.error('GET /api/admin/puzzles error', error);

    const message = sanitizeErrorMessage(error);

    if (error.message.includes('Validation error') || error.message.includes('Invalid date')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
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

    // Parse and validate request body with size limits
    const { date, puzzle } = await parseAndValidateJson(request, puzzleWithDateSchema);

    if (!isValidPuzzle(puzzle)) {
      return NextResponse.json(
        { success: false, error: 'Invalid puzzle structure' },
        { status: 400 }
      );
    }

    await setPuzzleForDate(date, {
      ...puzzle,
      createdBy: escapeHtml(admin.username),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Puzzle saved for ${date}`,
      date,
    });
  } catch (error) {
    logger.error('POST /api/admin/puzzles error', error);

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
      return NextResponse.json({ success: false, error: message }, { status: 413 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const validatedDate = dateSchema.parse(date);

    await deletePuzzleForDate(validatedDate);

    return NextResponse.json({
      success: true,
      message: `Puzzle deleted for ${validatedDate}`,
    });
  } catch (error) {
    logger.error('DELETE /api/admin/puzzles error', error);

    const message = sanitizeErrorMessage(error);

    if (error.message.includes('Invalid date')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
