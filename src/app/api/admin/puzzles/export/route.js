import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { createServerClient, createServerComponentClient } from '@/lib/supabase/server';
import { getPuzzleNumberForDate } from '@/lib/puzzleNumber';
import logger from '@/lib/logger';

// List of admin user IDs (add your Supabase user ID here)
const ADMIN_USER_IDS = [
  process.env.ADMIN_USER_ID, // Set in Vercel env vars
].filter(Boolean);

/**
 * GET /api/admin/puzzles/export
 * Export all puzzles from Vercel KV for backup or migration
 *
 * Query params:
 *   - format: 'json' (default) or 'migrate' (migrate directly to Supabase)
 *
 * Auth: Supports both Bearer token (API) and Supabase session (browser)
 */
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Try Bearer token auth first
    const authResult = await requireAdmin(request);

    // If Bearer auth fails, try Supabase session auth
    if (authResult.error) {
      // Use createServerComponentClient to read session cookies
      const supabaseAuth = await createServerComponentClient();
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
      }

      // Check if user is admin (use service role client to bypass RLS)
      const supabaseService = createServerClient();
      const { data: userData } = await supabaseService
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin =
        userData?.role === 'admin' ||
        ADMIN_USER_IDS.includes(user.id) ||
        user.email?.endsWith('@playtandem.com');

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }

      logger.info(`[export] Admin access granted via Supabase session: ${user.email}`);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Fetch all puzzle keys from Vercel KV
    const keys = await kv.keys('puzzle:*');
    logger.info(`[export] Found ${keys.length} puzzle keys in KV`);

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No puzzles found in Vercel KV',
        count: 0,
        puzzles: [],
      });
    }

    // Fetch all puzzles
    const puzzles = [];
    for (const key of keys) {
      try {
        const data = await kv.get(key);
        if (data) {
          const date = key.replace('puzzle:', '');
          puzzles.push({
            date,
            puzzleNumber: getPuzzleNumberForDate(date),
            ...data,
          });
        }
      } catch (error) {
        logger.error(`[export] Error fetching ${key}:`, error);
      }
    }

    // Sort by date
    puzzles.sort((a, b) => a.date.localeCompare(b.date));

    // If format is 'migrate', write directly to Supabase
    if (format === 'migrate') {
      const supabase = createServerClient();
      const results = { success: 0, failed: 0, errors: [] };

      for (const puzzle of puzzles) {
        try {
          const { error } = await supabase.from('tandem_puzzles').upsert(
            {
              date: puzzle.date,
              number: puzzle.puzzleNumber,
              theme: puzzle.theme,
              clues: puzzle.puzzles.map((p) => ({
                emoji: p.emoji,
                answer: p.answer,
                hint: p.hint || '',
              })),
              difficulty_rating: puzzle.difficultyRating || null,
              difficulty_factors: puzzle.difficultyFactors || null,
              created_by: puzzle.createdBy || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'date' }
          );

          if (error) {
            results.failed++;
            results.errors.push({ date: puzzle.date, error: error.message });
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ date: puzzle.date, error: error.message });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Migrated ${results.success} puzzles to Supabase`,
        migrated: results.success,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Limit error output
        totalInKV: puzzles.length,
      });
    }

    // Default: return as JSON export
    return NextResponse.json({
      success: true,
      message: `Exported ${puzzles.length} puzzles from Vercel KV`,
      count: puzzles.length,
      exportedAt: new Date().toISOString(),
      puzzles,
    });
  } catch (error) {
    logger.error('GET /api/admin/puzzles/export error', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Export failed',
      },
      { status: 500 }
    );
  }
}
