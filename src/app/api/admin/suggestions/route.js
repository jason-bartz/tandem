import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * GET /api/admin/suggestions
 * Fetch puzzle suggestions for a date range
 *
 * Query params:
 * - date: Specific date (YYYY-MM-DD)
 * - startDate/endDate: Date range
 * - status: Filter by status (pending, selected, dismissed)
 * - puzzleType: Filter by game type (tandem, mini, soup, reel)
 */
export async function GET(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const puzzleType = searchParams.get('puzzleType');

    const supabase = createServerClient();

    let query = supabase
      .from('puzzle_suggestions')
      .select('*')
      .order('target_date', { ascending: true })
      .order('puzzle_type', { ascending: true })
      .order('option_number', { ascending: true });

    if (date) {
      query = query.eq('target_date', date);
    } else if (startDate && endDate) {
      query = query.gte('target_date', startDate).lte('target_date', endDate);
    } else {
      // Default: upcoming 7 days
      const today = new Date().toISOString().split('T')[0];
      const weekOut = new Date();
      weekOut.setDate(weekOut.getDate() + 7);
      query = query
        .gte('target_date', today)
        .lte('target_date', weekOut.toISOString().split('T')[0]);
    }

    if (status) query = query.eq('status', status);
    if (puzzleType) query = query.eq('puzzle_type', puzzleType);

    const { data, error } = await query;

    if (error) {
      logger.error('[AdminSuggestions] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }

    // Group by date and puzzle type for easier consumption
    const grouped = {};
    for (const row of data || []) {
      const key = `${row.target_date}_${row.puzzle_type}`;
      if (!grouped[key]) {
        grouped[key] = {
          targetDate: row.target_date,
          puzzleType: row.puzzle_type,
          options: [],
        };
      }
      grouped[key].options.push(row);
    }

    return NextResponse.json({
      success: true,
      suggestions: Object.values(grouped),
      total: data?.length || 0,
    });
  } catch (error) {
    logger.error('[AdminSuggestions] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/suggestions
 * Update a suggestion's status (select, dismiss)
 *
 * Body:
 * - id: Suggestion ID
 * - status: 'selected' | 'dismissed'
 */
export async function PUT(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { id, status } = await request.json();

    if (!id || !['selected', 'dismissed', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Required: id and status (selected|dismissed|pending)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('puzzle_suggestions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: authResult.user?.username || 'admin',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('[AdminSuggestions] Update error:', error);
      return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
    }

    // If selecting, dismiss other options for same date+type
    if (status === 'selected') {
      await supabase
        .from('puzzle_suggestions')
        .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
        .eq('target_date', data.target_date)
        .eq('puzzle_type', data.puzzle_type)
        .neq('id', id)
        .eq('status', 'pending');
    }

    return NextResponse.json({ success: true, suggestion: data });
  } catch (error) {
    logger.error('[AdminSuggestions] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/suggestions
 * Delete suggestions for a date/type (used before regeneration)
 *
 * Query params:
 * - date: Target date (YYYY-MM-DD)
 * - puzzleType: Game type (optional, deletes all types if omitted)
 */
export async function DELETE(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const puzzleType = searchParams.get('puzzleType');

    if (!date) {
      return NextResponse.json({ error: 'Required: date query parameter' }, { status: 400 });
    }

    const supabase = createServerClient();

    let query = supabase.from('puzzle_suggestions').delete().eq('target_date', date);

    if (puzzleType) {
      query = query.eq('puzzle_type', puzzleType);
    }

    const { error } = await query;

    if (error) {
      logger.error('[AdminSuggestions] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete suggestions' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[AdminSuggestions] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
