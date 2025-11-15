import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { manualClearCache } from '@/lib/scheduler';
import { getCurrentPuzzleNumber } from '@/lib/puzzleNumber';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

/**
 * Admin Cache Management Endpoint
 *
 * Following Wordle best practices:
 * - No server-side puzzle rotation
 * - Puzzles change at user's local midnight
 * - This endpoint only clears caches
 */

export async function GET() {
  try {
    // Return current system status (no rotation info)
    const schedulerStatus = global.schedulerRunning || false;
    const currentPuzzleNumber = getCurrentPuzzleNumber();

    return NextResponse.json({
      success: true,
      currentPuzzleNumber: currentPuzzleNumber,
      schedulerRunning: schedulerStatus,
      serverTime: new Date().toISOString(),
      message: "Puzzles change at user's local midnight (client-side)",
    });
  } catch (error) {
    logger.error('GET /api/admin/rotate-puzzle error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get system status' },
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

    const result = await manualClearCache();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    logger.error('POST /api/admin/rotate-puzzle error', error);
    return NextResponse.json({ success: false, error: 'Failed to clear cache' }, { status: 500 });
  }
}
