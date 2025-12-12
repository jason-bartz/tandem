/**
 * API Route: User Achievements
 *
 * Manages user achievements stored in the database.
 * Allows authenticated users to sync their achievements across devices.
 *
 * Endpoints:
 * - GET: Retrieve all unlocked achievements for the authenticated user
 * - POST: Save newly unlocked achievements (merge with existing)
 */

import { createServerComponentClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

/**
 * GET /api/user-achievements
 * Retrieve authenticated user's unlocked achievements from database
 *
 * Response:
 * {
 *   achievements: string[] - Array of achievement IDs
 * }
 */
export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's achievements from database
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: true });

    if (error) {
      logger.error('[User Achievements API] Failed to fetch achievements:', error);
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    // Return array of achievement IDs
    const achievements = data.map((row) => row.achievement_id);

    return NextResponse.json({ achievements });
  } catch (error) {
    logger.error('[User Achievements API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user-achievements
 * Save newly unlocked achievements to database (merge with existing)
 *
 * Request body:
 * {
 *   achievements: string[] - Array of achievement IDs to save
 * }
 *
 * Response:
 * {
 *   success: true,
 *   achievements: string[] - Full list of all unlocked achievements (merged)
 *   added: number - Count of newly added achievements
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createServerComponentClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { achievements } = await request.json();

    // Validate input
    if (!Array.isArray(achievements)) {
      return NextResponse.json(
        { error: 'Invalid achievements format - expected array' },
        { status: 400 }
      );
    }

    // Filter to only valid achievement IDs (strings starting with com.tandemdaily.app)
    const validAchievements = achievements.filter(
      (id) => typeof id === 'string' && id.startsWith('com.tandemdaily.app')
    );

    if (validAchievements.length === 0) {
      // No valid achievements to save, just return existing
      const { data: existingData } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        achievements: existingData?.map((row) => row.achievement_id) || [],
        added: 0,
      });
    }

    // Insert achievements (ON CONFLICT DO NOTHING to avoid duplicates)
    // Supabase doesn't support ON CONFLICT DO NOTHING directly in upsert,
    // so we'll use the ignoreDuplicates option
    const insertData = validAchievements.map((achievementId) => ({
      user_id: user.id,
      achievement_id: achievementId,
    }));

    const { error: insertError } = await supabase.from('user_achievements').upsert(insertData, {
      onConflict: 'user_id,achievement_id',
      ignoreDuplicates: true,
    });

    if (insertError) {
      logger.error('[User Achievements API] Failed to save achievements:', insertError);
      return NextResponse.json({ error: 'Failed to save achievements' }, { status: 500 });
    }

    // Fetch all achievements after merge
    const { data: allAchievements, error: fetchError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (fetchError) {
      logger.error('[User Achievements API] Failed to fetch merged achievements:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }

    const mergedAchievements = allAchievements.map((row) => row.achievement_id);

    return NextResponse.json({
      success: true,
      achievements: mergedAchievements,
      added: validAchievements.length, // Approximate - some may have been duplicates
    });
  } catch (error) {
    logger.error('[User Achievements API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
