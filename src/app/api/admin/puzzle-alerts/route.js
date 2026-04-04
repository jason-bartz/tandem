import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/puzzle-alerts
 * Fetch puzzle alert settings
 */
export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('puzzle_alert_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // If no row exists yet, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          settings: {
            enabled: false,
            webhook_url: null,
            alert_start_hour: 9,
            check_interval_hours: 4,
            games_to_monitor: ['tandem', 'mini', 'reel', 'soup'],
          },
        });
      }
      logger.error('[Puzzle Alerts] Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    logger.error('[Puzzle Alerts] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/puzzle-alerts
 * Update puzzle alert settings
 */
export async function PUT(request) {
  try {
    const { error: authError, user } = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();

    const allowedFields = [
      'enabled',
      'webhook_url',
      'alert_start_hour',
      'check_interval_hours',
      'games_to_monitor',
    ];

    const updates = { updated_at: new Date().toISOString() };
    if (user?.username) updates.updated_by = user.username;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate alert_start_hour
    if (updates.alert_start_hour !== undefined) {
      const hour = Number(updates.alert_start_hour);
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        return NextResponse.json(
          { error: 'alert_start_hour must be between 0 and 23' },
          { status: 400 }
        );
      }
    }

    // Validate check_interval_hours
    if (updates.check_interval_hours !== undefined) {
      const hours = Number(updates.check_interval_hours);
      if (!Number.isInteger(hours) || hours < 0 || hours > 12) {
        return NextResponse.json(
          { error: 'check_interval_hours must be between 1 and 12' },
          { status: 400 }
        );
      }
    }

    // Validate games_to_monitor
    if (updates.games_to_monitor !== undefined) {
      const validGames = ['tandem', 'mini', 'reel', 'soup'];
      if (
        !Array.isArray(updates.games_to_monitor) ||
        !updates.games_to_monitor.every((g) => validGames.includes(g))
      ) {
        return NextResponse.json(
          { error: 'games_to_monitor must be an array of: tandem, mini, reel, soup' },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    // Upsert: try update first, insert if no row exists
    const { data: existing } = await supabase
      .from('puzzle_alert_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('puzzle_alert_settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase.from('puzzle_alert_settings').insert(updates).select().single();
    }

    if (result.error) {
      logger.error('[Puzzle Alerts] Error saving settings:', result.error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: result.data });
  } catch (error) {
    logger.error('[Puzzle Alerts] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/puzzle-alerts
 * Test the alert by running the check now (without cooldown)
 */
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { checkMissingPuzzles } = await import('@/lib/puzzleAlertChecker');
    const result = await checkMissingPuzzles({ skipCooldown: true });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('[Puzzle Alerts] POST (test) error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
