'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { sanitizeErrorMessage } from '@/lib/security/validation';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function toWeekKey(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().split('T')[0];
}

function toMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

function aggregateByPeriod(dailyData, periodFn) {
  const buckets = {};
  for (const entry of dailyData) {
    const key = periodFn(entry.date);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(entry);
  }
  return buckets;
}

// Supabase limits queries to 1000 rows by default.
// This helper paginates through all results using a query builder factory.
const PAGE_SIZE = 1000;

async function fetchAll(buildQuery) {
  const allRows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    allRows.push(...(data || []));
    hasMore = (data || []).length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allRows;
}

export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '90', 10), 365);
    const startDate = getDateNDaysAgo(days);

    const supabase = createServerClient();

    // Fetch all data sources in parallel, paginating past the 1000-row limit
    const [miniRows, alchemyRows, leaderboardRows, userRows, discoveryRows] = await Promise.all([
      fetchAll(() =>
        supabase
          .from('mini_stats')
          .select('puzzle_date, user_id, time_taken')
          .gte('puzzle_date', startDate)
          .order('puzzle_date', { ascending: true })
      ),

      fetchAll(() =>
        supabase
          .from('element_soup_game_stats')
          .select('puzzle_date, user_id, time_taken, completed')
          .gte('puzzle_date', startDate)
          .order('puzzle_date', { ascending: true })
      ),

      fetchAll(() =>
        supabase
          .from('leaderboard_entries')
          .select('game_type, puzzle_date, user_id, score')
          .in('game_type', ['tandem', 'reel', 'mini'])
          .eq('leaderboard_type', 'daily_speed')
          .eq('is_bot', false)
          .gte('puzzle_date', startDate)
          .order('puzzle_date', { ascending: true })
      ),

      fetchAll(() =>
        supabase
          .from('users')
          .select('id, created_at')
          .gte('created_at', startDate)
          .order('created_at', { ascending: true })
      ),

      fetchAll(() =>
        supabase
          .from('element_soup_first_discoveries')
          .select('id, discovered_at, user_id')
          .gte('discovered_at', startDate)
          .order('discovered_at', { ascending: true })
      ),
    ]);

    // Build daily maps
    const dailyMap = {};

    const ensureDay = (date) => {
      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          mini: 0,
          alchemy: 0,
          tandem: 0,
          reel: 0,
          miniTime: 0,
          alchemyTime: 0,
          miniUsers: new Set(),
          alchemyUsers: new Set(),
          tandemUsers: new Set(),
          reelUsers: new Set(),
          newUsers: 0,
          firstDiscoveries: 0,
        };
      }
      return dailyMap[date];
    };

    // Process mini stats
    for (const row of miniRows) {
      const day = ensureDay(row.puzzle_date);
      day.mini++;
      day.miniTime += row.time_taken || 0;
      day.miniUsers.add(row.user_id);
    }

    // Process alchemy stats
    for (const row of alchemyRows) {
      const day = ensureDay(row.puzzle_date);
      if (row.completed) {
        day.alchemy++;
        day.alchemyTime += row.time_taken || 0;
      }
      day.alchemyUsers.add(row.user_id);
    }

    // Process leaderboard entries (tandem, reel, & mini fallback)
    for (const row of leaderboardRows) {
      const day = ensureDay(row.puzzle_date);
      if (row.game_type === 'tandem') {
        day.tandem++;
        day.tandemUsers.add(row.user_id);
      } else if (row.game_type === 'reel') {
        day.reel++;
        day.reelUsers.add(row.user_id);
      } else if (row.game_type === 'mini') {
        // Use leaderboard as mini completion source when mini_stats has no record
        if (!day.miniUsers.has(row.user_id)) {
          day.mini++;
          day.miniUsers.add(row.user_id);
        }
      }
    }

    // Process new users
    for (const row of userRows) {
      const date = row.created_at.split('T')[0];
      const day = ensureDay(date);
      day.newUsers++;
    }

    // Process first discoveries
    for (const row of discoveryRows) {
      const date = row.discovered_at.split('T')[0];
      const day = ensureDay(date);
      day.firstDiscoveries++;
    }

    // Convert to sorted array with serializable values
    const dailyData = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => ({
        date: day.date,
        mini: day.mini,
        alchemy: day.alchemy,
        tandem: day.tandem,
        reel: day.reel,
        miniTime: day.miniTime,
        alchemyTime: day.alchemyTime,
        activePlayers: new Set([
          ...day.miniUsers,
          ...day.alchemyUsers,
          ...day.tandemUsers,
          ...day.reelUsers,
        ]).size,
        newUsers: day.newUsers,
        firstDiscoveries: day.firstDiscoveries,
      }));

    // Aggregate weekly
    const weeklyBuckets = aggregateByPeriod(dailyData, (d) => toWeekKey(d));
    const weekly = Object.entries(weeklyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, entries]) => ({
        period: week,
        mini: entries.reduce((s, e) => s + e.mini, 0),
        alchemy: entries.reduce((s, e) => s + e.alchemy, 0),
        tandem: entries.reduce((s, e) => s + e.tandem, 0),
        reel: entries.reduce((s, e) => s + e.reel, 0),
        miniTime: entries.reduce((s, e) => s + e.miniTime, 0),
        alchemyTime: entries.reduce((s, e) => s + e.alchemyTime, 0),
        activePlayers: entries.reduce((s, e) => s + e.activePlayers, 0),
        newUsers: entries.reduce((s, e) => s + e.newUsers, 0),
        firstDiscoveries: entries.reduce((s, e) => s + e.firstDiscoveries, 0),
      }));

    // Aggregate monthly
    const monthlyBuckets = aggregateByPeriod(dailyData, (d) => toMonthKey(d));
    const monthly = Object.entries(monthlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, entries]) => ({
        period: month,
        mini: entries.reduce((s, e) => s + e.mini, 0),
        alchemy: entries.reduce((s, e) => s + e.alchemy, 0),
        tandem: entries.reduce((s, e) => s + e.tandem, 0),
        reel: entries.reduce((s, e) => s + e.reel, 0),
        miniTime: entries.reduce((s, e) => s + e.miniTime, 0),
        alchemyTime: entries.reduce((s, e) => s + e.alchemyTime, 0),
        activePlayers: entries.reduce((s, e) => s + e.activePlayers, 0),
        newUsers: entries.reduce((s, e) => s + e.newUsers, 0),
        firstDiscoveries: entries.reduce((s, e) => s + e.firstDiscoveries, 0),
      }));

    // Summary totals
    const totals = {
      totalCompletions: dailyData.reduce((s, d) => s + d.mini + d.alchemy + d.tandem + d.reel, 0),
      totalMini: dailyData.reduce((s, d) => s + d.mini, 0),
      totalAlchemy: dailyData.reduce((s, d) => s + d.alchemy, 0),
      totalTandem: dailyData.reduce((s, d) => s + d.tandem, 0),
      totalReel: dailyData.reduce((s, d) => s + d.reel, 0),
      totalNewUsers: dailyData.reduce((s, d) => s + d.newUsers, 0),
      totalFirstDiscoveries: dailyData.reduce((s, d) => s + d.firstDiscoveries, 0),
      totalMiniTime: dailyData.reduce((s, d) => s + d.miniTime, 0),
      totalAlchemyTime: dailyData.reduce((s, d) => s + d.alchemyTime, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        daily: dailyData,
        weekly,
        monthly,
        totals,
        range: { startDate, days },
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/analytics error', error);
    const message = sanitizeErrorMessage(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
