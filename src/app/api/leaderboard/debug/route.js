import { createServerComponentClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Remove after testing
 * GET /api/leaderboard/debug
 * Check leaderboard data directly
 */
export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get raw entries from table
    const { data: entries, error: entriesError } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Try calling the function directly
    const { data: leaderboard, error: funcError } = await supabase.rpc('get_daily_leaderboard', {
      p_game_type: 'cryptic',
      p_puzzle_date: '2025-11-05',
      p_limit: 10,
    });

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      userEmail: user.email,
      entriesCount: entries?.length || 0,
      entries: entries || [],
      entriesError: entriesError?.message,
      userData,
      userError: userError?.message,
      leaderboardData: leaderboard || [],
      leaderboardError: funcError?.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal error',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
