import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAdminById, updateAdminUser } from '@/lib/adminUsers';
import { passwordSchema } from '@/lib/security/validation';
import logger from '@/lib/logger';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
});

// GET: Get current user's profile
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!auth.admin.userId) {
    // Env var fallback user
    return NextResponse.json({
      success: true,
      profile: {
        username: auth.admin.username,
        fullName: auth.admin.fullName,
        email: auth.admin.email,
        role: auth.admin.role,
      },
    });
  }

  const user = await getAdminById(auth.admin.userId);
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    profile: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    },
  });
}

// PUT: Update current user's profile
export async function PUT(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!auth.admin.userId) {
    return NextResponse.json(
      { success: false, error: 'Profile editing requires database-backed accounts' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const updates = {};
    if (validated.fullName) updates.fullName = validated.fullName;
    if (validated.email) updates.email = validated.email;

    // Password change requires current password verification
    if (validated.newPassword) {
      if (!validated.currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const { authenticateAdmin } = await import('@/lib/adminUsers');
      const authCheck = await authenticateAdmin(auth.admin.username, validated.currentPassword);
      if (!authCheck.success) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      updates.password = validated.newPassword;
    }

    const user = await updateAdminUser(auth.admin.userId, updates);
    return NextResponse.json({ success: true, profile: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    logger.error('Failed to update profile', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 400 }
    );
  }
}
