import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

const BCRYPT_ROUNDS = 12;

// Role hierarchy: owner > admin > editor
const ROLE_HIERARCHY = { owner: 3, admin: 2, editor: 1 };

export function hasPermission(actorRole, targetRole) {
  return (ROLE_HIERARCHY[actorRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
}

export function canManageUsers(role) {
  return role === 'owner' || role === 'admin';
}

export function canInviteRole(actorRole, targetRole) {
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin' && targetRole === 'editor') return true;
  return false;
}

/**
 * Authenticate admin user against the database.
 * Falls back to env vars if the admin_users table doesn't exist yet.
 */
export async function authenticateAdmin(username, password) {
  const supabase = createServerClient();

  try {
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*, avatars:avatar_id(id, display_name, image_path)')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    // If the table doesn't exist or there's a schema-level error, fall back to env vars.
    // Supabase returns error codes like '42P01' (undefined table) or PGRST errors
    // for missing relations. A "not found" single-row error (PGRST116) means the
    // table exists but the user wasn't found.
    if (error) {
      const isTableError =
        error.code === '42P01' ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist') ||
        (error.code !== 'PGRST116' && !error.details?.includes('0 rows'));

      if (isTableError) {
        logger.warn('admin_users table not available, falling back to env var auth', error);
        return authenticateFromEnv(username, password);
      }

      // Table exists but user not found
      return { success: false, reason: 'Invalid username' };
    }

    if (!user) {
      return { success: false, reason: 'Invalid username' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return { success: false, reason: 'Invalid password' };
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        avatarId: user.avatar_id,
        avatar: user.avatars || null,
      },
    };
  } catch (err) {
    // Fall back to env var auth if anything unexpected happens
    logger.warn('admin_users auth failed, falling back to env var auth', err);
    return authenticateFromEnv(username, password);
  }
}

async function authenticateFromEnv(username, password) {
  const isValidUsername = username === process.env.ADMIN_USERNAME;
  const isValidPassword =
    isValidUsername && (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH));

  if (!isValidUsername || !isValidPassword) {
    return { success: false, reason: isValidUsername ? 'Invalid password' : 'Invalid username' };
  }

  return {
    success: true,
    user: {
      id: null,
      username,
      fullName: username,
      email: null,
      role: 'owner',
    },
  };
}

export async function getAdminById(id) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select(
      'id, username, full_name, email, role, is_active, last_login_at, created_at, avatar_id, avatars:avatar_id(id, display_name, image_path)'
    )
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Failed to get admin user', error);
    return null;
  }
  return data;
}

export async function getAdminByUsername(username) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select(
      'id, username, full_name, email, role, is_active, last_login_at, created_at, avatar_id, avatars:avatar_id(id, display_name, image_path)'
    )
    .eq('username', username)
    .single();

  if (error) return null;
  return data;
}

export async function listAdminUsers() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select(
      'id, username, full_name, email, role, is_active, last_login_at, created_at, avatar_id, avatars:avatar_id(id, display_name, image_path)'
    )
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to list admin users', error);
    return [];
  }
  return data;
}

export async function createAdminUser({ username, password, fullName, email, role, createdBy }) {
  const supabase = createServerClient();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      username,
      password_hash: passwordHash,
      full_name: fullName,
      email,
      role,
      created_by: createdBy,
    })
    .select('id, username, full_name, email, role, created_at')
    .single();

  if (error) {
    logger.error('Failed to create admin user', error);
    if (error.code === '23505') {
      const field = error.message.includes('username') ? 'username' : 'email';
      throw new Error(`An account with that ${field} already exists`);
    }
    throw new Error('Failed to create user');
  }

  return data;
}

export async function updateAdminUser(id, updates) {
  const supabase = createServerClient();

  const updateData = {};
  if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.avatarId !== undefined) updateData.avatar_id = updates.avatarId;

  if (updates.password) {
    updateData.password_hash = await bcrypt.hash(updates.password, BCRYPT_ROUNDS);
  }

  const { data, error } = await supabase
    .from('admin_users')
    .update(updateData)
    .eq('id', id)
    .select(
      'id, username, full_name, email, role, is_active, avatar_id, avatars:avatar_id(id, display_name, image_path)'
    )
    .single();

  if (error) {
    logger.error('Failed to update admin user', error);
    if (error.code === '23505') {
      throw new Error('That email is already in use');
    }
    throw new Error('Failed to update user');
  }

  return data;
}

export async function generatePasswordResetToken(email) {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('admin_users')
    .select('id, username, full_name, email')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (!user) return null;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase
    .from('admin_users')
    .update({
      password_reset_token: hashedToken,
      password_reset_expires: expires.toISOString(),
    })
    .eq('id', user.id);

  return { token: rawToken, user };
}

export async function resetPasswordWithToken(token, newPassword) {
  const supabase = createServerClient();
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const { data: user, error } = await supabase
    .from('admin_users')
    .select('id, username')
    .eq('password_reset_token', hashedToken)
    .gt('password_reset_expires', new Date().toISOString())
    .eq('is_active', true)
    .single();

  if (error || !user) return false;

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await supabase
    .from('admin_users')
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
    })
    .eq('id', user.id);

  return true;
}
