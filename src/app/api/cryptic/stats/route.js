import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/cryptic/stats
 * Get user's cryptic puzzle stats
 * Query params:
 * - date: ISO date string (YYYY-MM-DD) - get stats for specific puzzle
 * - aggregate: boolean - get aggregate stats instead
 */
export async function GET(request) {
  try {
    const supabase = await createServerComponentClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const aggregate = searchParams.get('aggregate') === 'true';

    // Get aggregate stats
    if (aggregate) {
      const { data, error } = await supabase
        .from('cryptic_user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No stats yet, return defaults
          return NextResponse.json({
            success: true,
            stats: {
              total_completed: 0,
              current_streak: 0,
              longest_streak: 0,
              total_hints_used: 0,
              perfect_solves: 0,
              average_time: 0,
              last_played_date: null,
            },
          });
        }

        logger.error('[API] Error fetching aggregate cryptic stats', { error });
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        stats: data,
      });
    }

    // Get stats for specific puzzle or all puzzles
    let query = supabase.from('cryptic_stats').select('*').eq('user_id', user.id);

    if (date) {
      query = query.eq('puzzle_date', date).single();
    } else {
      query = query.order('puzzle_date', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116' && date) {
        // No stats for this puzzle yet
        return NextResponse.json({
          success: true,
          stats: null,
        });
      }

      logger.error('[API] Error fetching cryptic stats', { error });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stats: data,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in GET /api/cryptic/stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/cryptic/stats
 * Save user's cryptic puzzle stats
 * Body: {
 *   puzzle_date,
 *   completed,
 *   time_taken,
 *   hints_used,
 *   hints_used_types,
 *   attempts
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createServerComponentClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      puzzle_date,
      completed,
      time_taken,
      hints_used,
      hints_used_types,
      attempts,
    } = body;

    if (!puzzle_date) {
      return NextResponse.json({ error: 'Missing puzzle_date' }, { status: 400 });
    }

    logger.info('[API] Saving cryptic stats', {
      user_id: user.id,
      puzzle_date,
      completed,
      hints_used,
    });

    // Upsert stats
    const statsData = {
      user_id: user.id,
      puzzle_date,
      completed: completed || false,
      time_taken: time_taken || null,
      hints_used: hints_used || 0,
      hints_used_types: hints_used_types || [],
      attempts: attempts || 0,
    };

    if (completed) {
      statsData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('cryptic_stats')
      .upsert(statsData, {
        onConflict: 'user_id,puzzle_date',
      })
      .select()
      .single();

    if (error) {
      logger.error('[API] Error saving cryptic stats', { error });
      return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 });
    }

    logger.info('[API] Cryptic stats saved successfully', {
      user_id: user.id,
      puzzle_date,
    });

    return NextResponse.json({
      success: true,
      stats: data,
    });
  } catch (error) {
    logger.error('[API] Unexpected error in POST /api/cryptic/stats', {
      error: error.message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
