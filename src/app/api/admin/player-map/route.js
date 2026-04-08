'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const supabase = createServerClient();

    // Fetch all users with a country_code
    const { data, error } = await supabase
      .from('users')
      .select('country_code, country_flag')
      .not('country_code', 'is', null);

    if (error) {
      logger.error('Player map query error', error);
      throw new Error('Failed to fetch country data');
    }

    // Aggregate counts per country
    const countryMap = {};
    for (const row of data || []) {
      const code = row.country_code;
      if (!code) continue;
      if (!countryMap[code]) {
        countryMap[code] = { code, flag: row.country_flag, count: 0 };
      }
      countryMap[code].count++;
    }

    const countries = Object.values(countryMap).sort((a, b) => b.count - a.count);
    const totalPlayers = countries.reduce((sum, c) => sum + c.count, 0);

    return NextResponse.json({
      success: true,
      countries,
      totalCountries: countries.length,
      totalPlayers,
    });
  } catch (error) {
    logger.error('GET /api/admin/player-map error', error);
    return NextResponse.json({ success: false, error: 'Failed to load map data' }, { status: 500 });
  }
}
