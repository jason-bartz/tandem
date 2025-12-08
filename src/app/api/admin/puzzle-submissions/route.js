'use server';

import { NextResponse } from 'next/server';
import {
  getSubmissions,
  getSubmissionById,
  getSubmissionStatusCounts,
  updateSubmission,
} from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  submissionAdminUpdateSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
} from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { SUBMISSION_STATUS } from '@/lib/constants';
import logger from '@/lib/logger';

function normalizeStatus(status) {
  if (!status) return null;
  const value = status.toLowerCase();
  return Object.values(SUBMISSION_STATUS).includes(value) ? value : null;
}

/**
 * Get puzzle submissions
 * @route GET /api/admin/puzzle-submissions
 *
 * Query params:
 * - status: Filter by status (pending, approved, needs_edit, archived)
 * - limit: Max results (default 200, max 500)
 */
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

    const [submissions, counts] = await Promise.all([
      getSubmissions({ status: statusParam, limit }),
      getSubmissionStatusCounts(),
    ]);

    return NextResponse.json({
      success: true,
      submissions,
      counts,
    });
  } catch (error) {
    logger.error('GET /api/admin/puzzle-submissions error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Update a puzzle submission
 * @route PATCH /api/admin/puzzle-submissions
 *
 * Body:
 * - id: Submission UUID
 * - status: New status (optional)
 * - adminNotes: Admin notes (optional)
 */
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

    const body = await parseAndValidateJson(request, submissionAdminUpdateSchema);
    const { id, status, adminNotes } = body;

    const existingSubmission = await getSubmissionById(id);
    if (!existingSubmission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const updates = {};
    if (status) updates.status = status;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    updates.reviewedBy = admin.username;

    const updatedSubmission = await updateSubmission(id, updates);
    const counts = await getSubmissionStatusCounts();

    logger.info('Submission updated', {
      submissionId: id,
      status,
      adminNotes: adminNotes ? 'updated' : 'unchanged',
      reviewedBy: admin.username,
    });

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      counts,
    });
  } catch (error) {
    logger.error('PATCH /api/admin/puzzle-submissions error', error);
    const message = sanitizeErrorMessage(error);
    const statusCode = error.status || (message?.toLowerCase().includes('invalid') ? 400 : 500);
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}
