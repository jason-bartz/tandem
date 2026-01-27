import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import aiService from '@/services/ai.service';
import { normalizeKey } from '@/lib/daily-alchemy.constants';

/**
 * Validate generated paths against existing combinations in the database
 * Returns paths with conflict information for each step
 */
async function validatePathsAgainstDatabase(paths, supabase) {
  // Collect all unique combination keys from all paths
  const allCombos = new Map();
  for (const path of paths) {
    for (const step of path.steps) {
      const key = normalizeKey(step.elementA, step.elementB);
      if (!allCombos.has(key)) {
        allCombos.set(key, {
          elementA: step.elementA,
          elementB: step.elementB,
          generatedResult: step.result,
          generatedEmoji: step.resultEmoji,
        });
      }
    }
  }

  // Also collect all unique element names to check for emoji consistency
  const allElements = new Map();
  for (const path of paths) {
    for (const step of path.steps) {
      // Track elements used as inputs
      if (!allElements.has(step.elementA.toLowerCase())) {
        allElements.set(step.elementA.toLowerCase(), { name: step.elementA, emoji: step.emojiA });
      }
      if (!allElements.has(step.elementB.toLowerCase())) {
        allElements.set(step.elementB.toLowerCase(), { name: step.elementB, emoji: step.emojiB });
      }
      // Track result elements
      if (!allElements.has(step.result.toLowerCase())) {
        allElements.set(step.result.toLowerCase(), { name: step.result, emoji: step.resultEmoji });
      }
    }
  }

  // Batch query for all combination keys
  const comboKeys = Array.from(allCombos.keys());
  const { data: existingCombos } = await supabase
    .from('element_combinations')
    .select('combination_key, result_element, result_emoji')
    .in('combination_key', comboKeys);

  // Build lookup map of existing combinations
  const existingComboMap = new Map();
  if (existingCombos) {
    for (const combo of existingCombos) {
      existingComboMap.set(combo.combination_key, {
        result: combo.result_element,
        emoji: combo.result_emoji,
      });
    }
  }

  // Query for existing elements to check emoji consistency
  const elementNames = Array.from(allElements.keys());
  const { data: existingElements } = await supabase
    .from('element_combinations')
    .select('result_element, result_emoji')
    .in(
      'result_element',
      elementNames.map((n) => allElements.get(n).name)
    );

  // Build lookup map for canonical element emojis
  const elementEmojiMap = new Map();
  if (existingElements) {
    for (const el of existingElements) {
      const key = el.result_element.toLowerCase();
      if (!elementEmojiMap.has(key)) {
        elementEmojiMap.set(key, el.result_emoji);
      }
    }
  }

  // Annotate paths with validation info
  const validatedPaths = paths.map((path) => {
    const validatedSteps = path.steps.map((step) => {
      const key = normalizeKey(step.elementA, step.elementB);
      const existing = existingComboMap.get(key);

      let status = 'new'; // green - new combination
      let conflict = null;
      let emojiMismatch = null;

      if (existing) {
        if (existing.result.toLowerCase() === step.result.toLowerCase()) {
          status = 'exists'; // yellow - already exists with same result
          // Check if emoji differs
          if (existing.emoji !== step.resultEmoji) {
            emojiMismatch = {
              existing: existing.emoji,
              generated: step.resultEmoji,
            };
          }
        } else {
          status = 'conflict'; // red - different result exists
          conflict = {
            existingResult: existing.result,
            existingEmoji: existing.emoji,
            generatedResult: step.result,
            generatedEmoji: step.resultEmoji,
          };
        }
      } else {
        // Check if result element exists with different emoji
        const canonicalEmoji = elementEmojiMap.get(step.result.toLowerCase());
        if (canonicalEmoji && canonicalEmoji !== step.resultEmoji) {
          emojiMismatch = {
            existing: canonicalEmoji,
            generated: step.resultEmoji,
          };
        }
      }

      return {
        ...step,
        validation: {
          status,
          conflict,
          emojiMismatch,
        },
      };
    });

    // Calculate path summary
    const conflicts = validatedSteps.filter((s) => s.validation.status === 'conflict').length;
    const existing = validatedSteps.filter((s) => s.validation.status === 'exists').length;
    const newCombos = validatedSteps.filter((s) => s.validation.status === 'new').length;

    return {
      ...path,
      steps: validatedSteps,
      validationSummary: {
        conflicts,
        existing,
        new: newCombos,
        total: validatedSteps.length,
        hasConflicts: conflicts > 0,
      },
    };
  });

  return validatedPaths;
}

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

    logger.info('[PathGenerator] Paths generated, validating against database', {
      targetElement: trimmedTarget,
      pathCount: result.paths.length,
    });

    // Validate generated paths against existing combinations
    const validatedPaths = await validatePathsAgainstDatabase(result.paths, supabase);

    // Calculate overall validation summary
    const totalConflicts = validatedPaths.reduce(
      (sum, p) => sum + p.validationSummary.conflicts,
      0
    );
    const totalExisting = validatedPaths.reduce((sum, p) => sum + p.validationSummary.existing, 0);

    logger.info('[PathGenerator] Paths validated', {
      targetElement: trimmedTarget,
      pathCount: validatedPaths.length,
      totalConflicts,
      totalExisting,
      existingCombosUsed: existingCombinations.length,
    });

    return NextResponse.json({
      success: true,
      paths: validatedPaths,
      existingCombinationsCount: existingCombinations.length,
      validationSummary: {
        totalConflicts,
        totalExisting,
        hasConflicts: totalConflicts > 0,
      },
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
