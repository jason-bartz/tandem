import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * GET /api/horoscope
 *
 * Fetches a daily horoscope based on zodiac sign and current date
 * Implements deterministic daily rotation using date-based seed
 *
 * Query params:
 * - sign: Zodiac sign name (e.g., "Aries", "Taurus")
 * - timezone: User's timezone (optional, defaults to UTC)
 *
 * Mobile web game best practices:
 * - Lightweight response (< 1KB)
 * - Fast query with indexed lookups
 * - Deterministic rotation (same horoscope all day)
 * - Cache-friendly with date-based keys
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sign = searchParams.get('sign');
    const timezone = searchParams.get('timezone') || 'UTC';

    // Validate sign parameter
    if (!sign) {
      return NextResponse.json({ error: 'Missing required parameter: sign' }, { status: 400 });
    }

    // This ensures the horoscope changes at midnight in their local time
    const userDate = new Date().toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Parse the date to get consistent format
    const [month, day, year] = userDate.split('/');
    const dateString = `${year}-${month}-${day}`;

    // Create deterministic seed from date
    // This ensures same horoscope all day, rotates at midnight
    const seed = dateString.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    const horoscopeNumber = (seed % 100) + 1;

    // Fetch horoscope from database
    const { data, error } = await supabase
      .from('horoscopes')
      .select('text, horoscope_number')
      .eq('sign', sign)
      .eq('horoscope_number', horoscopeNumber)
      .single();

    if (error) {
      logger.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch horoscope' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Horoscope not found' }, { status: 404 });
    }

    // Return horoscope with cache headers
    // Cache for 1 hour (horoscope changes daily, but cache shorter for timezone edge cases)
    return NextResponse.json(
      {
        sign,
        text: data.text,
        number: data.horoscope_number,
        date: dateString,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'CDN-Cache-Control': 'public, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    logger.error('Error fetching horoscope:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
