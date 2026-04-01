import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

/**
 * GET - Fetch all user emails for recipient selection
 */
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('email, username')
      .not('email', 'is', null)
      .neq('email', '')
      .order('email', { ascending: true });

    if (error) throw error;

    // Deduplicate by email
    const seen = new Set();
    const recipients = (data || [])
      .filter((u) => {
        if (!u.email || seen.has(u.email)) return false;
        seen.add(u.email);
        return true;
      })
      .map((u) => ({ email: u.email, username: u.username || null }));

    return NextResponse.json({
      success: true,
      recipients,
      total: recipients.length,
    });
  } catch (error) {
    logger.error('Error fetching recipients', error);
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
  }
}
