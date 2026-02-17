import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/import/elements/detail?name=...
 * Get a single element with all combinations where it appears
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const decodedName = (searchParams.get('name') || '').trim();

    if (!decodedName) {
      return NextResponse.json({ error: 'Missing element name' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get the element
    const { data: element, error: elementError } = await supabase
      .from('import_elements')
      .select('*')
      .ilike('name', decodedName)
      .single();

    if (elementError || !element) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    // Get all combinations where this element is element_a
    const { data: asElementA } = await supabase
      .from('import_combinations')
      .select('*')
      .ilike('element_a', decodedName)
      .order('element_b', { ascending: true });

    // Get all combinations where this element is element_b
    const { data: asElementB } = await supabase
      .from('import_combinations')
      .select('*')
      .ilike('element_b', decodedName)
      .order('element_a', { ascending: true });

    // Get all combinations where this element is the result
    const { data: asResult } = await supabase
      .from('import_combinations')
      .select('*')
      .ilike('result_element', decodedName)
      .order('element_a', { ascending: true });

    // Combine and dedupe combinations where it's an input
    const inputCombinations = [];
    const seenKeys = new Set();

    for (const combo of [...(asElementA || []), ...(asElementB || [])]) {
      if (!seenKeys.has(combo.combination_key)) {
        seenKeys.add(combo.combination_key);
        inputCombinations.push({
          ...combo,
          otherElement:
            combo.element_a.toLowerCase() === decodedName.toLowerCase()
              ? combo.element_b
              : combo.element_a,
        });
      }
    }

    // Sort input combinations by the other element
    inputCombinations.sort((a, b) => a.otherElement.localeCompare(b.otherElement));

    return NextResponse.json({
      element,
      combinations: {
        asInput: inputCombinations,
        asResult: asResult || [],
      },
      stats: {
        asInputCount: inputCombinations.length,
        asResultCount: (asResult || []).length,
        totalInvolved: inputCombinations.length + (asResult || []).length,
      },
    });
  } catch (error) {
    logger.error('[ImportElementsAPI] Unexpected error fetching element', {
      error: error.message,
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
