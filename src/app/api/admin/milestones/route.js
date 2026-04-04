'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sanitizeErrorMessage } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

/**
 * Milestone definitions: each has a key, label, category, game icon,
 * query function, and threshold ladder.
 */
const MILESTONE_DEFINITIONS = [
  // Platform
  {
    key: 'total_users',
    label: 'Total Users',
    category: 'Platform',
    icon: null,
    thresholds: [100, 500, 1000, 5000, 10000, 25000, 50000, 100000],
    query: async (supabase) => {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
  {
    key: 'countries_represented',
    label: 'Countries Represented',
    category: 'Platform',
    icon: null,
    thresholds: [10, 25, 50, 75, 100],
    query: async (supabase) => {
      const { data } = await supabase
        .from('users')
        .select('country_code')
        .not('country_code', 'is', null);
      return new Set((data || []).map((u) => u.country_code).filter(Boolean)).size;
    },
  },
  {
    key: 'total_achievements_unlocked',
    label: 'Achievements Unlocked',
    category: 'Platform',
    icon: null,
    thresholds: [500, 1000, 5000, 10000, 50000],
    query: async (supabase) => {
      const { count } = await supabase
        .from('user_achievements')
        .select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
  {
    key: 'multi_game_players',
    label: 'Multi-Game Players (2+)',
    category: 'Platform',
    icon: null,
    thresholds: [100, 500, 1000, 5000, 10000],
    query: async (supabase) => {
      const [tandem, mini, reel, soup] = await Promise.all([
        supabase.from('user_stats').select('user_id'),
        supabase.from('mini_user_stats').select('user_id'),
        supabase.from('reel_user_stats').select('user_id'),
        supabase.from('element_soup_user_stats').select('user_id'),
      ]);
      const counts = new Map();
      for (const dataset of [tandem.data, mini.data, reel.data, soup.data]) {
        for (const row of dataset || []) {
          counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
        }
      }
      let multiCount = 0;
      for (const c of counts.values()) {
        if (c >= 2) multiCount++;
      }
      return multiCount;
    },
  },
  {
    key: 'all_game_players',
    label: 'All-Game Players (4/4)',
    category: 'Platform',
    icon: null,
    thresholds: [50, 100, 500, 1000, 5000],
    query: async (supabase) => {
      const [tandem, mini, reel, soup] = await Promise.all([
        supabase.from('user_stats').select('user_id'),
        supabase.from('mini_user_stats').select('user_id'),
        supabase.from('reel_user_stats').select('user_id'),
        supabase.from('element_soup_user_stats').select('user_id'),
      ]);
      const counts = new Map();
      for (const dataset of [tandem.data, mini.data, reel.data, soup.data]) {
        for (const row of dataset || []) {
          counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
        }
      }
      let allCount = 0;
      for (const c of counts.values()) {
        if (c >= 4) allCount++;
      }
      return allCount;
    },
  },
  {
    key: 'total_puzzles_solved',
    label: 'Total Puzzles Solved',
    category: 'Platform',
    icon: null,
    thresholds: [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    query: async (supabase) => {
      const [tandem, mini, reel, soup] = await Promise.all([
        supabase.from('user_stats').select('wins'),
        supabase.from('mini_user_stats').select('total_completed'),
        supabase.from('reel_user_stats').select('games_won'),
        supabase.from('element_soup_user_stats').select('total_completed'),
      ]);
      const tandemTotal = (tandem.data || []).reduce((s, r) => s + (r.wins || 0), 0);
      const miniTotal = (mini.data || []).reduce((s, r) => s + (r.total_completed || 0), 0);
      const reelTotal = (reel.data || []).reduce((s, r) => s + (r.games_won || 0), 0);
      const soupTotal = (soup.data || []).reduce((s, r) => s + (r.total_completed || 0), 0);
      return tandemTotal + miniTotal + reelTotal + soupTotal;
    },
  },

  // Daily Tandem
  {
    key: 'tandem_puzzles_played',
    label: 'Puzzles Played',
    category: 'Daily Tandem',
    icon: 'tandem',
    thresholds: [1000, 5000, 10000, 50000, 100000],
    query: async (supabase) => {
      const { data } = await supabase.from('user_stats').select('played');
      return (data || []).reduce((sum, r) => sum + (r.played || 0), 0);
    },
  },
  {
    key: 'tandem_puzzles_won',
    label: 'Puzzles Won',
    category: 'Daily Tandem',
    icon: 'tandem',
    thresholds: [500, 1000, 5000, 10000, 50000],
    query: async (supabase) => {
      const { data } = await supabase.from('user_stats').select('wins');
      return (data || []).reduce((sum, r) => sum + (r.wins || 0), 0);
    },
  },
  {
    key: 'tandem_longest_streak',
    label: 'Longest Streak (any user)',
    category: 'Daily Tandem',
    icon: 'tandem',
    thresholds: [30, 60, 100, 180, 365],
    query: async (supabase) => {
      const { data } = await supabase
        .from('user_stats')
        .select('best_streak')
        .order('best_streak', { ascending: false })
        .limit(1);
      return data?.[0]?.best_streak || 0;
    },
  },

  // Daily Mini
  {
    key: 'mini_puzzles_completed',
    label: 'Puzzles Completed',
    category: 'Daily Mini',
    icon: 'mini',
    thresholds: [1000, 5000, 10000, 50000, 100000],
    query: async (supabase) => {
      const { data } = await supabase.from('mini_user_stats').select('total_completed');
      return (data || []).reduce((sum, r) => sum + (r.total_completed || 0), 0);
    },
  },
  {
    key: 'mini_perfect_solves',
    label: 'Perfect Solves',
    category: 'Daily Mini',
    icon: 'mini',
    thresholds: [100, 500, 1000, 5000, 10000],
    query: async (supabase) => {
      const { data } = await supabase.from('mini_user_stats').select('perfect_solves');
      return (data || []).reduce((sum, r) => sum + (r.perfect_solves || 0), 0);
    },
  },
  // Reel Connections
  {
    key: 'reel_games_played',
    label: 'Games Played',
    category: 'Reel Connections',
    icon: 'reel',
    thresholds: [1000, 5000, 10000, 50000, 100000],
    query: async (supabase) => {
      const { data } = await supabase.from('reel_user_stats').select('games_played');
      return (data || []).reduce((sum, r) => sum + (r.games_played || 0), 0);
    },
  },
  {
    key: 'reel_games_won',
    label: 'Games Won',
    category: 'Reel Connections',
    icon: 'reel',
    thresholds: [500, 1000, 5000, 10000, 50000],
    query: async (supabase) => {
      const { data } = await supabase.from('reel_user_stats').select('games_won');
      return (data || []).reduce((sum, r) => sum + (r.games_won || 0), 0);
    },
  },
  {
    key: 'reel_longest_streak',
    label: 'Longest Win Streak (any user)',
    category: 'Reel Connections',
    icon: 'reel',
    thresholds: [15, 30, 60, 100],
    query: async (supabase) => {
      const { data } = await supabase
        .from('reel_user_stats')
        .select('best_streak')
        .order('best_streak', { ascending: false })
        .limit(1);
      return data?.[0]?.best_streak || 0;
    },
  },

  // Daily Alchemy
  {
    key: 'alchemy_puzzles_completed',
    label: 'Puzzles Completed',
    category: 'Daily Alchemy',
    icon: 'soup',
    thresholds: [1000, 5000, 10000, 50000, 100000],
    query: async (supabase) => {
      const { data } = await supabase.from('element_soup_user_stats').select('total_completed');
      return (data || []).reduce((sum, r) => sum + (r.total_completed || 0), 0);
    },
  },
  {
    key: 'alchemy_first_discoveries',
    label: 'First Discoveries',
    category: 'Daily Alchemy',
    icon: 'soup',
    thresholds: [100, 500, 1000, 5000, 10000],
    query: async (supabase) => {
      const { count } = await supabase
        .from('element_soup_first_discoveries')
        .select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
  {
    key: 'alchemy_under_par',
    label: 'Under-Par Solves',
    category: 'Daily Alchemy',
    icon: 'soup',
    thresholds: [100, 500, 1000, 5000, 10000],
    query: async (supabase) => {
      const { data } = await supabase.from('element_soup_user_stats').select('under_par_count');
      return (data || []).reduce((sum, r) => sum + (r.under_par_count || 0), 0);
    },
  },
];

/**
 * GET /api/admin/milestones
 * Fetches current values for all milestones + any previously reached milestones from the log.
 */
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const supabase = createServerClient();

    // Fetch milestone log (previously reached milestones)
    const { data: logEntries, error: logError } = await supabase
      .from('milestone_log')
      .select('*')
      .order('reached_at', { ascending: true });

    if (logError) {
      logger.warn('[Milestones] Could not fetch milestone_log, continuing without it:', logError);
    }

    // Build a map of reached milestones: key -> Set of thresholds reached
    const reachedMap = new Map();
    for (const entry of logEntries || []) {
      if (!reachedMap.has(entry.milestone_key)) {
        reachedMap.set(entry.milestone_key, new Map());
      }
      reachedMap.get(entry.milestone_key).set(entry.threshold, {
        reachedAt: entry.reached_at,
        actualValue: entry.actual_value,
      });
    }

    // Query all current values in parallel
    const currentValues = await Promise.all(
      MILESTONE_DEFINITIONS.map(async (def) => {
        try {
          const value = await def.query(supabase);
          return { key: def.key, value };
        } catch (err) {
          logger.error(`[Milestones] Error querying ${def.key}:`, err);
          return { key: def.key, value: null };
        }
      })
    );

    const valueMap = new Map(currentValues.map((v) => [v.key, v.value]));

    // Build response with milestone status
    const milestones = MILESTONE_DEFINITIONS.map((def) => {
      const currentValue = valueMap.get(def.key);
      const reached = reachedMap.get(def.key) || new Map();

      // Find next threshold to reach
      const nextThreshold = def.thresholds.find((t) => currentValue < t) || null;
      // Find the last threshold that was passed
      const lastReachedThreshold =
        [...def.thresholds].reverse().find((t) => currentValue >= t) || null;
      const progress =
        nextThreshold !== null
          ? Math.min(100, Math.round((currentValue / nextThreshold) * 100))
          : 100;

      // Build threshold status list
      const thresholdStatus = def.thresholds.map((t) => ({
        value: t,
        reached: currentValue >= t,
        loggedAt: reached.get(t)?.reachedAt || null,
      }));

      return {
        key: def.key,
        label: def.label,
        category: def.category,
        icon: def.icon,
        currentValue,
        nextThreshold,
        lastReachedThreshold,
        progress,
        thresholds: thresholdStatus,
        allReached: nextThreshold === null && def.thresholds.length > 0,
      };
    });

    // Check for newly reached milestones and log them
    const newlyReached = [];
    for (const milestone of milestones) {
      if (milestone.currentValue === null) continue;
      for (const t of milestone.thresholds) {
        if (t.reached && !t.loggedAt) {
          newlyReached.push({
            milestone_key: milestone.key,
            threshold: t.value,
            actual_value: milestone.currentValue,
          });
        }
      }
    }

    if (newlyReached.length > 0) {
      const { error: insertError } = await supabase.from('milestone_log').upsert(newlyReached, {
        onConflict: 'milestone_key,threshold',
        ignoreDuplicates: true,
      });
      if (insertError) {
        logger.warn('[Milestones] Error logging new milestones:', insertError);
      } else {
        logger.info(`[Milestones] Logged ${newlyReached.length} newly reached milestones`);
      }
    }

    // Group by category
    const categories = {};
    for (const m of milestones) {
      if (!categories[m.category]) {
        categories[m.category] = [];
      }
      categories[m.category].push(m);
    }

    return NextResponse.json({
      success: true,
      categories,
      milestones,
      newlyReached: newlyReached.length,
    });
  } catch (error) {
    logger.error('[GET /api/admin/milestones] Error:', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
