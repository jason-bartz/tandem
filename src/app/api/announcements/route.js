import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

// GET - fetch the most recent active announcement (public)
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('id, text')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      announcement: data || null,
    });
  } catch (error) {
    logger.error('Error fetching active announcement', error);
    return NextResponse.json({ success: true, announcement: null });
  }
}
