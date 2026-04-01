import { NextResponse } from 'next/server';
import { generatePasswordResetToken, resetPasswordWithToken } from '@/lib/adminUsers';
import { passwordSchema } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';
import { z } from 'zod';

const requestResetSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

// POST: Request a password reset or complete one
export async function POST(request) {
  const rateLimitResponse = await withRateLimit(request, 'password-reset');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // If token is present, this is a reset completion
    if (body.token) {
      const validated = resetSchema.parse(body);
      const success = await resetPasswordWithToken(validated.token, validated.password);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: 'Password has been reset' });
    }

    // Otherwise, request a reset link
    const validated = requestResetSchema.parse(body);
    const result = await generatePasswordResetToken(validated.email);

    // Always return success to prevent email enumeration
    if (result) {
      // Send the reset email
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tandemdaily.com'}/admin/reset-password?token=${result.token}`;

        await resend.emails.send({
          from: 'Tandem Admin <noreply@tandemdaily.com>',
          to: result.user.email,
          subject: 'Reset your Tandem Admin password',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #111827; margin-bottom: 16px;">Password Reset</h2>
              <p style="color: #6B7280; line-height: 1.6;">
                Hi ${result.user.full_name},
              </p>
              <p style="color: #6B7280; line-height: 1.6;">
                A password reset was requested for your Tandem Admin account. Click the button below to set a new password. This link expires in 1 hour.
              </p>
              <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Reset Password
              </a>
              <p style="color: #9CA3AF; font-size: 14px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        logger.error('Failed to send password reset email', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    logger.error('Password reset failed', error);
    return NextResponse.json({ success: false, error: 'Password reset failed' }, { status: 500 });
  }
}
