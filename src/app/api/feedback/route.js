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
import { sendEmail } from '@/lib/email/emailService';
import { generateFeedbackNotificationEmail } from '@/lib/email/templates/feedbackNotification';

/**
 * Send feedback notification email to admin
 * This function is called asynchronously and should not throw errors
 * @param {Object} feedback - Feedback entry data
 */
async function sendFeedbackNotificationEmail(feedback) {
  try {
    // Get notification recipient from environment variable
    const notificationEmail = process.env.FEEDBACK_NOTIFICATION_EMAIL;

    if (!notificationEmail) {
      logger.warn('FEEDBACK_NOTIFICATION_EMAIL not configured - skipping email notification', {
        feedbackId: feedback.id,
      });
      return;
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notificationEmail)) {
      logger.error('Invalid FEEDBACK_NOTIFICATION_EMAIL format', {
        feedbackId: feedback.id,
      });
      return;
    }

    // Generate email content
    const htmlContent = generateFeedbackNotificationEmail({
      category: feedback.category,
      message: feedback.message,
      email: feedback.email,
      username: feedback.username,
      allowContact: feedback.allowContact,
      platform: feedback.platform,
      userAgent: feedback.userAgent,
      createdAt: feedback.createdAt,
    });

    // Prepare sender email (use verified domain)
    // Note: Update this to your verified domain in Resend
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL || 'notifications@tandemdaily.com';

    // Send email notification
    const result = await sendEmail({
      from: `Tandem Feedback <${fromEmail}>`,
      to: notificationEmail,
      subject: `New ${feedback.category} - Tandem Feedback`,
      html: htmlContent,
      replyTo: feedback.allowContact ? feedback.email : undefined,
      metadata: {
        feedbackId: feedback.id,
        category: feedback.category,
        platform: feedback.platform,
      },
    });

    if (result.success) {
      logger.info('Feedback notification email sent successfully', {
        feedbackId: feedback.id,
        emailId: result.data?.id,
      });
    } else {
      logger.error('Failed to send feedback notification email', {
        feedbackId: feedback.id,
        error: result.error,
      });
    }
  } catch (error) {
    // This catch block should never throw - just log the error
    logger.error('Unexpected error in sendFeedbackNotificationEmail', {
      feedbackId: feedback?.id,
      error: error.message,
      stack: error.stack,
    });
  }
}

export async function POST(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { user, response } = await requireAuth(request);

    if (!user) {
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

    // Send email notification asynchronously (don't block response)
    // We intentionally don't await this to avoid delaying the user's response
    sendFeedbackNotificationEmail(createdEntry).catch((emailError) => {
      // Log email errors but don't fail the request
      logger.error('Failed to send feedback notification email', {
        feedbackId: createdEntry.id,
        error: emailError.message,
      });
    });

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
