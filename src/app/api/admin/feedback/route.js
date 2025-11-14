'use server';

import { NextResponse } from 'next/server';
import {
  addFeedbackComment,
  getFeedbackEntries,
  getFeedbackEntryById,
  getFeedbackStatusCounts,
  updateFeedbackEntry,
} from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  feedbackAdminUpdateSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
} from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { FEEDBACK_STATUS } from '@/lib/constants';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

function normalizeStatus(status) {
  if (!status) return null;
  const value = status.toLowerCase();
  return Object.values(FEEDBACK_STATUS).includes(value) ? value : null;
}

export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const statusParam = rawStatus ? normalizeStatus(rawStatus) : null;
    if (rawStatus && !statusParam) {
      return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 });
    }
    const limitParam = parseInt(searchParams.get('limit') || '200', 10);
    const limit = Number.isNaN(limitParam) ? 200 : Math.min(Math.max(limitParam, 1), 500);

    const [feedback, counts] = await Promise.all([
      getFeedbackEntries({ status: statusParam, limit }),
      getFeedbackStatusCounts(),
    ]);

    return NextResponse.json({
      success: true,
      feedback,
      counts,
    });
  } catch (error) {
    logger.error('GET /api/admin/feedback error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }
    const { admin } = authResult;

    const body = await parseAndValidateJson(request, feedbackAdminUpdateSchema);
    const { id, status, comment } = body;

    // Ensure entry exists
    const existingEntry = await getFeedbackEntryById(id);
    if (!existingEntry) {
      return NextResponse.json({ success: false, error: 'Feedback not found' }, { status: 404 });
    }

    let updatedEntry = existingEntry;

    if (status) {
      updatedEntry = await updateFeedbackEntry(id, { status });
    }

    if (comment) {
      const commentEntry = {
        id: randomUUID(),
        author: admin.username,
        message: comment,
        createdAt: new Date().toISOString(),
      };
      updatedEntry = await addFeedbackComment(id, commentEntry);
    }

    const counts = await getFeedbackStatusCounts();

    return NextResponse.json({
      success: true,
      feedback: updatedEntry,
      counts,
    });
  } catch (error) {
    logger.error('PATCH /api/admin/feedback error', error);
    const message = sanitizeErrorMessage(error);
    const statusCode = error.status || (message?.toLowerCase().includes('invalid') ? 400 : 500);
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}
