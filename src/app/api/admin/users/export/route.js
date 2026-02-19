'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sanitizeErrorMessage } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateForCsv(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return dateStr;
  }
}

export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const supabase = createServerClient();

    // Fetch all users from the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error('Export users query error', usersError);
      throw new Error('Failed to fetch users');
    }

    // Fetch all active subscriptions
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');
    const subscriberSet = new Set((activeSubs || []).map((s) => s.user_id));

    // Enrich with auth data in batches to avoid overwhelming the API
    const BATCH_SIZE = 50;
    const enrichedUsers = [];

    for (let i = 0; i < (users || []).length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const enrichedBatch = await Promise.all(
        batch.map(async (user) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(user.id);
            const authUser = authData?.user;
            const identities = authUser?.identities || [];
            const provider =
              identities.length > 0
                ? identities[0].provider
                : authUser?.is_anonymous
                  ? 'anonymous'
                  : 'email';

            return {
              id: user.id,
              username: user.username || '',
              email: user.email || authUser?.email || '',
              createdAt: formatDateForCsv(authUser?.created_at || user.created_at),
              lastSignInAt: formatDateForCsv(authUser?.last_sign_in_at),
              isAnonymous: authUser?.is_anonymous ? 'Yes' : 'No',
              provider,
              countryCode: user.country_code || '',
              hasSubscription: subscriberSet.has(user.id) ? 'Yes' : 'No',
            };
          } catch {
            return {
              id: user.id,
              username: user.username || '',
              email: user.email || '',
              createdAt: formatDateForCsv(user.created_at),
              lastSignInAt: '',
              isAnonymous: '',
              provider: '',
              countryCode: user.country_code || '',
              hasSubscription: subscriberSet.has(user.id) ? 'Yes' : 'No',
            };
          }
        })
      );
      enrichedUsers.push(...enrichedBatch);
    }

    // Build CSV
    const headers = [
      'User ID',
      'Username',
      'Email',
      'Created',
      'Last Active',
      'Anonymous',
      'Provider',
      'Country',
      'Subscriber',
    ];

    const rows = enrichedUsers.map((u) =>
      [
        u.id,
        u.username,
        u.email,
        u.createdAt,
        u.lastSignInAt,
        u.isAnonymous,
        u.provider,
        u.countryCode,
        u.hasSubscription,
      ]
        .map(escapeCsvField)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tandem-users-${now}.csv"`,
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/users/export error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
