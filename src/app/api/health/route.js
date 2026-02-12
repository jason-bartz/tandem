import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Lightweight health check — tests Supabase DB connectivity.
 * Returns 200 if healthy, 503 if the database is unreachable.
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Minimal query to test DB connectivity
    const { error } = await supabase
      .from('element_soup_puzzles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}
