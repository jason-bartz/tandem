'use server';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getPuzzleAuditLog } from '@/lib/db';
import { sanitizeErrorMessage } from '@/lib/security/validation';
import logger from '@/lib/logger';

/**
 * GET /api/admin/puzzle-audit?date=YYYY-MM-DD
 * Returns audit history for all puzzles on a given date.
 */
export async function GET(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Valid date parameter required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const audit = await getPuzzleAuditLog(date);

    return NextResponse.json({ success: true, audit });
  } catch (error) {
    logger.error('GET /api/admin/puzzle-audit error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
