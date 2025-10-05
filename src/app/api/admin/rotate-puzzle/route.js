import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { manualRotatePuzzle, getCurrentPuzzleDateET } from '@/lib/scheduler';
import { withRateLimit } from '@/lib/security/rateLimiter';

export async function GET() {
  try {
    // Check current puzzle date without requiring auth
    const currentDate = getCurrentPuzzleDateET();
    const lastRotation = global.lastPuzzleRotation || null;
    const schedulerStatus = global.schedulerRunning || false;

    return NextResponse.json({
      success: true,
      currentPuzzleDate: currentDate,
      lastRotation: lastRotation,
      schedulerRunning: schedulerStatus,
      serverTime: new Date().toISOString(),
      etTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
    });
  } catch (error) {
    console.error('GET /api/admin/rotate-puzzle error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get rotation status' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Apply rate limiting for write operations
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Verify admin authentication with CSRF protection
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const targetDate = body.date || null;

    // Perform manual rotation
    const result = await manualRotatePuzzle(targetDate);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Puzzle rotated to ${result.date}`,
        date: result.date,
        puzzleInfo: result.puzzle,
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/admin/rotate-puzzle error:', error);
    return NextResponse.json({ success: false, error: 'Failed to rotate puzzle' }, { status: 500 });
  }
}
