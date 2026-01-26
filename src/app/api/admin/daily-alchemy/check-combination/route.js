import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { normalizeKey } from '@/lib/daily-alchemy.constants';

/**
 * GET /api/admin/element-soup/check-combination
 * Check if a combination of two elements already exists
 * Query params:
 * - elementA: first element name (required)
 * - elementB: second element name (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const elementA = searchParams.get('elementA') || '';
    const elementB = searchParams.get('elementB') || '';

    if (!elementA.trim() || !elementB.trim()) {
      return NextResponse.json({ exists: false });
    }

    const combinationKey = normalizeKey(elementA.trim(), elementB.trim());
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('element_combinations')
      .select('result_element, result_emoji')
      .eq('combination_key', combinationKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected when combo doesn't exist
      logger.error('[CheckCombination] Database error', { error: error.message });
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    if (data) {
      return NextResponse.json({
        exists: true,
        result: data.result_element,
        emoji: data.result_emoji,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    logger.error('[CheckCombination] Unexpected error', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
