'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { userSearchParamsSchema, sanitizeErrorMessage } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseSortParam(sort) {
  const map = {
    created_desc: { field: 'created_at', ascending: false },
    created_asc: { field: 'created_at', ascending: true },
    username_asc: { field: 'username', ascending: true },
    username_desc: { field: 'username', ascending: false },
    // last_sign_in sorts are handled post-fetch since it's in auth.users
    last_sign_in_desc: { field: 'created_at', ascending: false },
    last_sign_in_asc: { field: 'created_at', ascending: true },
  };
  return map[sort] || map.created_desc;
}

async function getOverviewMetrics(supabase) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();

  const [totalResult, newTodayResult, newWeekResult, subscriberResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekStart),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  return {
    totalUsers: totalResult.count || 0,
    newToday: newTodayResult.count || 0,
    newThisWeek: newWeekResult.count || 0,
    activeSubscriptions: subscriberResult.count || 0,
  };
}

export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const params = userSearchParamsSchema.parse({
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || 'all',
      sort: searchParams.get('sort') || 'created_desc',
      page: searchParams.get('page') || '1',
      perPage: searchParams.get('perPage') || '25',
    });

    const supabase = createServerClient();
    const { field, ascending } = parseSortParam(params.sort);
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    // Build query on users table
    let query = supabase.from('users').select('*', { count: 'exact' });

    // Search filter
    if (params.search) {
      if (UUID_REGEX.test(params.search)) {
        query = query.eq('id', params.search);
      } else {
        query = query.or(`username.ilike.%${params.search}%,email.ilike.%${params.search}%`);
      }
    }

    // Sorting and pagination
    query = query.order(field, { ascending }).range(from, to);

    const [{ data: users, count, error: usersError }, metrics] = await Promise.all([
      query,
      getOverviewMetrics(supabase),
    ]);

    if (usersError) {
      logger.error('Users query error', usersError);
      throw new Error('Failed to fetch users');
    }

    // Fetch active subscription user IDs for this page
    const userIds = (users || []).map((u) => u.id);
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'active');
    const subscriberSet = new Set((activeSubscriptions || []).map((s) => s.user_id));

    // Enrich with auth data for this page
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user) => {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(user.id);
          return {
            id: user.id,
            email: user.email || authData?.user?.email || null,
            username: user.username || null,
            avatarId: user.selected_avatar_id || null,
            countryCode: user.country_code || null,
            countryFlag: user.country_flag || null,
            isAnonymous: authData?.user?.is_anonymous || false,
            createdAt: authData?.user?.created_at || user.created_at,
            lastSignInAt: authData?.user?.last_sign_in_at || null,
            hasSubscription: subscriberSet.has(user.id),
          };
        } catch {
          // If auth lookup fails, return what we have
          return {
            id: user.id,
            email: user.email || null,
            username: user.username || null,
            avatarId: user.selected_avatar_id || null,
            countryCode: user.country_code || null,
            countryFlag: user.country_flag || null,
            isAnonymous: false,
            createdAt: user.created_at,
            lastSignInAt: null,
            hasSubscription: subscriberSet.has(user.id),
          };
        }
      })
    );

    // Filter by type (anonymous/registered) post-fetch
    let filteredUsers = enrichedUsers;
    if (params.type === 'anonymous') {
      filteredUsers = enrichedUsers.filter((u) => u.isAnonymous);
    } else if (params.type === 'registered') {
      filteredUsers = enrichedUsers.filter((u) => !u.isAnonymous);
    }

    // Post-fetch sort for last_sign_in
    if (params.sort.startsWith('last_sign_in')) {
      const dir = params.sort === 'last_sign_in_desc' ? -1 : 1;
      filteredUsers.sort((a, b) => {
        const dateA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
        const dateB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
        return (dateA - dateB) * dir;
      });
    }

    // Count anonymous vs registered from metrics (separate query for accuracy)
    const { data: authListData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    const totalAuthUsers = authListData?.total || metrics.totalUsers;

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      pagination: {
        page: params.page,
        perPage: params.perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / params.perPage),
      },
      metrics: {
        ...metrics,
        totalUsers: totalAuthUsers,
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/users error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
