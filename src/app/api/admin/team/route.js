import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  canInviteRole,
  hasPermission,
} from '@/lib/adminUsers';
import { passwordSchema } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: passwordSchema,
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(255),
  role: z.enum(['admin', 'editor']),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['admin', 'editor']).optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

// GET: List all admin users
export async function GET(request) {
  const auth = await requireAdmin(request, { minRole: 'admin' });
  if (auth.error) return auth.error;

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    logger.error('Failed to list admin users', error);
    return NextResponse.json({ success: false, error: 'Failed to list users' }, { status: 500 });
  }
}

// POST: Create a new admin user (invite)
export async function POST(request) {
  const auth = await requireAdmin(request, { minRole: 'admin' });
  if (auth.error) return auth.error;

  const rateLimitResponse = await withRateLimit(request, 'admin-team');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    // Check if actor can invite this role
    if (!canInviteRole(auth.admin.role, validated.role)) {
      return NextResponse.json(
        { success: false, error: `You cannot invite users with the ${validated.role} role` },
        { status: 403 }
      );
    }

    const user = await createAdminUser({
      ...validated,
      createdBy: auth.admin.userId,
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    logger.error('Failed to create admin user', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 400 }
    );
  }
}

// PUT: Update an admin user
export async function PUT(request) {
  const auth = await requireAdmin(request, { minRole: 'admin' });
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    const { id, ...updates } = validated;

    // Owners can edit anyone. Admins can only edit editors.
    // Users can always edit their own profile (name, email, password) but not role.
    const isSelf = auth.admin.userId === id;

    if (!isSelf) {
      // Need to check if actor has permission over target
      // Fetch the target user to check their role
      const { getAdminById } = await import('@/lib/adminUsers');
      const targetUser = await getAdminById(id);

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      if (!hasPermission(auth.admin.role, targetUser.role)) {
        return NextResponse.json(
          { success: false, error: 'You cannot modify this user' },
          { status: 403 }
        );
      }

      // Check role change permissions
      if (updates.role && !canInviteRole(auth.admin.role, updates.role)) {
        return NextResponse.json(
          { success: false, error: `You cannot assign the ${updates.role} role` },
          { status: 403 }
        );
      }
    } else {
      // Self-edit: cannot change own role or deactivate self
      delete updates.role;
      delete updates.isActive;
    }

    const user = await updateAdminUser(id, updates);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    logger.error('Failed to update admin user', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 400 }
    );
  }
}
