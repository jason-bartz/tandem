import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET - Fetch Reel Connections puzzles for a date range
 * Used by the archive calendar to show available puzzles
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const { data: puzzles, error } = await supabase
      .from('reel_connections_puzzles')
      .select('id, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      puzzles: puzzles || [],
    });
  } catch (error) {
    logger.error('Error fetching Reel Connections archive:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch archive' }, { status: 500 });
  }
}
