'use server';

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth/verify';
import {
  feedbackSubmissionSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
} from '@/lib/security/validation';
import { createFeedbackEntry } from '@/lib/db';
import { FEEDBACK_STATUS } from '@/lib/constants';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

export async function POST(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    console.log('[Feedback API] Checking auth...');
    const { user, response } = await requireAuth(request);
    console.log('[Feedback API] Auth result:', { hasUser: !!user, userId: user?.id });
    if (!user) {
      console.log('[Feedback API] No user, returning auth error response');
      return response;
    }

    const { category, message, allowContact } = await parseAndValidateJson(
      request,
      feedbackSubmissionSchema
    );

    // Get platform and user agent from request
    const userAgent = request.headers.get('user-agent') || null;
    const platform = userAgent?.toLowerCase().includes('mobile') ? 'mobile' : 'web';

    const entry = {
      id: randomUUID(),
      userId: user.id,
      email: user.email || user.user_metadata?.email || null,
      category,
      message,
      allowContact: !!allowContact,
      platform,
      userAgent,
      status: FEEDBACK_STATUS.NEW,
    };

    const createdEntry = await createFeedbackEntry(entry);

    return NextResponse.json({ success: true, feedback: createdEntry });
  } catch (error) {
    logger.error('POST /api/feedback error', error);
    console.error('[Feedback API] Full error:', error);
    console.error('[Feedback API] Error stack:', error.stack);
    const message = sanitizeErrorMessage(error);
    const status = error.status || (message?.toLowerCase().includes('invalid') ? 400 : 500);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
