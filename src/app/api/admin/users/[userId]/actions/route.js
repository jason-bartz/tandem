'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import {
  userAdminActionSchema,
  parseAndValidateJson,
  sanitizeErrorMessage,
} from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

export async function POST(request, { params }) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { userId } = await params;

    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await parseAndValidateJson(request, userAdminActionSchema);
    const supabase = createServerClient();

    if (body.action === 'send_password_reset') {
      // Get user email first
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authError || !authData?.user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const email = authData.user.email;
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'User has no email address (anonymous account)' },
          { status: 400 }
        );
      }

      // Send password reset email via Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tandemdaily.com'}/account/reset-password`,
      });

      if (resetError) {
        logger.error('Password reset error', resetError);
        throw new Error('Failed to send password reset email');
      }

      logger.info('Admin sent password reset', {
        admin: authResult.admin?.username,
        targetUserId: userId,
        targetEmail: email,
      });

      return NextResponse.json({
        success: true,
        message: `Password reset email sent to ${email}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error('POST /api/admin/users/[userId]/actions error', error);
    const message = sanitizeErrorMessage(error);
    const statusCode = error.message?.includes('Validation') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status: statusCode });
  }
}
