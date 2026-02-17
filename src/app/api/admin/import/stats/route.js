import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

/**
 * GET /api/admin/import/stats
 * Get statistics about imported elements and combinations
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get total counts
    const { count: elementCount, error: elementError } = await supabase
      .from('import_elements')
      .select('*', { count: 'exact', head: true });

    const { count: combinationCount, error: combinationError } = await supabase
      .from('import_combinations')
      .select('*', { count: 'exact', head: true });

    if (elementError || combinationError) {
      logger.error('[ImportStatsAPI] Error fetching counts', {
        elementError: elementError?.message,
        combinationError: combinationError?.message,
      });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Get letter distribution
    const { data: elements } = await supabase.from('import_elements').select('name');

    const letterCounts = {};
    let otherCount = 0;

    for (const el of elements || []) {
      const firstChar = el.name.charAt(0).toUpperCase();
      if (/^[A-Z]$/.test(firstChar)) {
        letterCounts[firstChar] = (letterCounts[firstChar] || 0) + 1;
      } else {
        otherCount++;
      }
    }

    // Build alphabet array with counts
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({
      letter,
      count: letterCounts[letter] || 0,
    }));

    if (otherCount > 0) {
      alphabet.push({ letter: 'OTHER', count: otherCount });
    }

    return NextResponse.json({
      totalElements: elementCount,
      totalCombinations: combinationCount,
      alphabet,
    });
  } catch (error) {
    logger.error('[ImportStatsAPI] Unexpected error', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
