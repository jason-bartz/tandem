import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import aiService from '@/services/ai.service';
import { normalizeKey } from '@/lib/element-soup.constants';

/**
 * POST /api/admin/element-soup/generate-path
 * Generate 3 different paths from starter elements to a target element
 * Body:
 * - targetElement: string - The target element to reach
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { targetElement } = body;

    if (!targetElement || typeof targetElement !== 'string') {
      return NextResponse.json({ error: 'Missing required field: targetElement' }, { status: 400 });
    }

    const trimmedTarget = targetElement.trim();
    if (trimmedTarget.length < 1 || trimmedTarget.length > 100) {
      return NextResponse.json(
        { error: 'Target element must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    logger.info('[PathGenerator] Generating paths', { targetElement: trimmedTarget });

    // Fetch existing combinations from database to inform AI
    const supabase = createServerClient();
    const { data: existingCombos } = await supabase
      .from('element_combinations')
      .select('element_a, element_b, result_element, result_emoji')
      .not('element_a', 'eq', '_ADMIN') // Exclude admin placeholders
      .order('use_count', { ascending: false })
      .limit(200);

    // Transform to format AI expects
    const existingCombinations = (existingCombos || []).map((c) => ({
      elementA: c.element_a,
      elementB: c.element_b,
      result: c.result_element,
      resultEmoji: c.result_emoji,
    }));

    logger.info('[PathGenerator] Fetched existing combinations', {
      count: existingCombinations.length,
    });

    // Call AI service to generate paths with existing combinations context
    const result = await aiService.generateElementPaths(trimmedTarget, existingCombinations);

    logger.info('[PathGenerator] Paths generated successfully', {
      targetElement: trimmedTarget,
      pathCount: result.paths.length,
      existingCombosUsed: existingCombinations.length,
    });

    return NextResponse.json({
      success: true,
      paths: result.paths,
      existingCombinationsCount: existingCombinations.length,
    });
  } catch (error) {
    logger.error('[PathGenerator] Error generating paths', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Failed to generate paths', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/element-soup/generate-path
 * Save a selected path's combinations to the database
 * Body:
 * - path: object - The selected path with steps
 * - targetElement: string - The target element name
 * - targetEmoji: string - The target element emoji
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { path, targetElement, targetEmoji } = body;

    if (!path || !path.steps || !Array.isArray(path.steps)) {
      return NextResponse.json(
        { error: 'Missing required field: path with steps array' },
        { status: 400 }
      );
    }

    if (!targetElement || !targetEmoji) {
      return NextResponse.json(
        { error: 'Missing required fields: targetElement, targetEmoji' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    let created = 0;
    let skipped = 0;
    const errors = [];
    const conflicts = []; // Track when generated result differs from existing

    // Check if target element already exists and get its canonical emoji
    let canonicalTargetEmoji = targetEmoji;
    const { data: existingTarget } = await supabase
      .from('element_combinations')
      .select('result_emoji')
      .ilike('result_element', targetElement)
      .limit(1)
      .single();

    if (existingTarget?.result_emoji) {
      canonicalTargetEmoji = existingTarget.result_emoji;
      logger.info('[PathGenerator] Using existing emoji for target', {
        targetElement,
        existingEmoji: canonicalTargetEmoji,
        requestedEmoji: targetEmoji,
      });
    }

    logger.info('[PathGenerator] Saving path to database', {
      targetElement,
      stepCount: path.steps.length,
      canonicalEmoji: canonicalTargetEmoji,
    });

    // Process each step in the path
    for (const step of path.steps) {
      const { elementA, elementB, result } = step;
      // Use canonical emoji if this step creates the target element
      const resultEmoji =
        result.toLowerCase() === targetElement.toLowerCase()
          ? canonicalTargetEmoji
          : step.resultEmoji;

      // Normalize the combination key
      const combinationKey = normalizeKey(elementA, elementB);

      try {
        // Check if this combination already exists
        const { data: existing } = await supabase
          .from('element_combinations')
          .select('id, result_element, result_emoji')
          .eq('combination_key', combinationKey)
          .single();

        if (existing) {
          // Check if there's a conflict (different result)
          if (existing.result_element.toLowerCase() !== result.toLowerCase()) {
            conflicts.push({
              elementA,
              elementB,
              generated: { result, emoji: resultEmoji },
              existing: { result: existing.result_element, emoji: existing.result_emoji },
            });
            logger.info('[PathGenerator] Combination conflict detected', {
              combinationKey,
              generatedResult: result,
              existingResult: existing.result_element,
            });
          } else {
            logger.info('[PathGenerator] Combination already exists (matching)', {
              combinationKey,
              existingResult: existing.result_element,
            });
          }
          skipped++;
          continue;
        }

        // Insert the new combination
        const { error: insertError } = await supabase.from('element_combinations').insert({
          combination_key: combinationKey,
          element_a: elementA,
          element_b: elementB,
          result_element: result,
          result_emoji: resultEmoji,
          ai_generated: true,
          discovered_by: null,
        });

        if (insertError) {
          // Handle unique constraint violation (race condition)
          if (insertError.code === '23505') {
            logger.info('[PathGenerator] Combination created by another request', {
              combinationKey,
            });
            skipped++;
          } else {
            logger.error('[PathGenerator] Failed to insert combination', {
              combinationKey,
              error: insertError.message,
            });
            errors.push(`Failed to save ${elementA} + ${elementB}: ${insertError.message}`);
          }
        } else {
          logger.info('[PathGenerator] Combination created', {
            combinationKey,
            result,
          });
          created++;
        }
      } catch (stepError) {
        logger.error('[PathGenerator] Error processing step', {
          step,
          error: stepError.message,
        });
        errors.push(`Error processing ${elementA} + ${elementB}: ${stepError.message}`);
      }
    }

    // Ensure the target element exists as a result (in case it was created through a different path)
    // This creates an admin placeholder if the target doesn't exist yet
    const targetKey = `_admin_${targetElement.toLowerCase().replace(/\s+/g, '_')}`;
    const { data: targetExists } = await supabase
      .from('element_combinations')
      .select('id')
      .ilike('result_element', targetElement)
      .limit(1);

    if (!targetExists || targetExists.length === 0) {
      // Create admin placeholder for target
      const { error: targetError } = await supabase.from('element_combinations').insert({
        combination_key: targetKey,
        element_a: '_ADMIN',
        element_b: '_DEFINED',
        result_element: targetElement,
        result_emoji: targetEmoji,
        ai_generated: false,
        discovered_by: null,
      });

      if (targetError && targetError.code !== '23505') {
        logger.error('[PathGenerator] Failed to create target element', {
          targetElement,
          error: targetError.message,
        });
      }
    }

    logger.info('[PathGenerator] Path saved', {
      targetElement,
      created,
      skipped,
      conflicts: conflicts.length,
      errors: errors.length,
    });

    return NextResponse.json({
      success: true,
      created,
      skipped,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('[PathGenerator] Error saving path', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Failed to save path', message: error.message },
      { status: 500 }
    );
  }
}
