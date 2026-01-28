import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import aiService from '@/services/ai.service';
import { normalizeKey, STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

// Starter element emoji map
const STARTER_EMOJI_MAP = STARTER_ELEMENTS.reduce((acc, el) => {
  acc[el.name.toLowerCase()] = el.emoji;
  return acc;
}, {});

/**
 * Generate emojis for elements that don't have them
 */
async function generateEmojisForElements(elementNames) {
  if (!elementNames || elementNames.length === 0) {
    return {};
  }

  logger.info('[ManualPathway] Generating emojis for elements', {
    count: elementNames.length,
    elements: elementNames,
  });

  const prompt = `You are choosing emojis for an element combination game.

For each element below, choose 1 appropriate emoji that visually represents it.
Choose iconic, recognizable emojis. Use only 1 emoji per element.

ELEMENTS:
${elementNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Respond with ONLY a JSON object mapping element names to emojis:
{
  "${elementNames[0]}": "🎯",
  ...
}

Rules:
- Use exactly 1 emoji per element
- Choose the most recognizable emoji for each concept
- No profanity or offensive emojis`;

  try {
    const result = await aiService._generateWithGateway(prompt, {
      model: aiService.alchemyPrimaryModel,
      maxTokens: 500,
      temperature: 0.7,
      fallbackModels: [aiService.alchemyFallbackModel],
    });

    // Parse response
    let jsonStr = result.text.trim();
    const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const startIdx = result.text.indexOf('{');
      const endIdx = result.text.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = result.text.slice(startIdx, endIdx + 1);
      }
    }

    const emojiMap = JSON.parse(jsonStr);
    logger.info('[ManualPathway] Generated emojis', { emojiMap });
    return emojiMap;
  } catch (error) {
    logger.error('[ManualPathway] Failed to generate emojis', { error: error.message });
    // Return fallback emojis
    return elementNames.reduce((acc, name) => {
      acc[name] = '✨';
      return acc;
    }, {});
  }
}

/**
 * POST /api/admin/daily-alchemy/manual-pathway
 * Save a manually created pathway, generating emojis for elements that need them
 * Body:
 * - steps: Array of { elementA, elementB, result } - emojis are optional
 * - finalElement: The target element name
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { steps, finalElement } = body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'Missing required field: steps array' }, { status: 400 });
    }

    if (!finalElement) {
      return NextResponse.json({ error: 'Missing required field: finalElement' }, { status: 400 });
    }

    logger.info('[ManualPathway] Processing manual pathway', {
      stepCount: steps.length,
      finalElement,
    });

    const supabase = createServerClient();

    // Collect all unique element names that need emojis
    const allElements = new Set();
    for (const step of steps) {
      allElements.add(step.elementA.trim());
      allElements.add(step.elementB.trim());
      allElements.add(step.result.trim());
    }

    // Check which elements already have emojis in the database
    const { data: existingElements } = await supabase
      .from('element_combinations')
      .select('result_element, result_emoji')
      .in(
        'result_element',
        Array.from(allElements).map((n) => n)
      );

    // Build emoji map from existing elements
    const emojiMap = {};
    if (existingElements) {
      for (const el of existingElements) {
        emojiMap[el.result_element.toLowerCase()] = el.result_emoji;
      }
    }

    // Add starter elements
    for (const [name, emoji] of Object.entries(STARTER_EMOJI_MAP)) {
      emojiMap[name] = emoji;
    }

    // Add any emojis provided in the steps
    for (const step of steps) {
      if (step.emojiA) {
        emojiMap[step.elementA.toLowerCase()] = step.emojiA;
      }
      if (step.emojiB) {
        emojiMap[step.elementB.toLowerCase()] = step.emojiB;
      }
      if (step.resultEmoji) {
        emojiMap[step.result.toLowerCase()] = step.resultEmoji;
      }
    }

    // Find elements that still need emojis
    const needsEmoji = Array.from(allElements).filter((name) => !emojiMap[name.toLowerCase()]);

    // Generate emojis for elements that need them
    if (needsEmoji.length > 0) {
      const generatedEmojis = await generateEmojisForElements(needsEmoji);
      for (const [name, emoji] of Object.entries(generatedEmojis)) {
        emojiMap[name.toLowerCase()] = emoji;
      }
    }

    // Build the complete path with emojis
    const completeSteps = steps.map((step, idx) => ({
      step: idx + 1,
      elementA: step.elementA.trim(),
      emojiA: emojiMap[step.elementA.toLowerCase()] || '✨',
      elementB: step.elementB.trim(),
      emojiB: emojiMap[step.elementB.toLowerCase()] || '✨',
      result: step.result.trim(),
      resultEmoji: emojiMap[step.result.toLowerCase()] || '✨',
    }));

    const finalEmoji = emojiMap[finalElement.toLowerCase()] || '✨';

    // Save all combinations
    let created = 0;
    let skipped = 0;
    const errors = [];
    const conflicts = [];

    for (const step of completeSteps) {
      const combinationKey = normalizeKey(step.elementA, step.elementB);

      try {
        // Check if combination exists
        const { data: existing } = await supabase
          .from('element_combinations')
          .select('id, result_element, result_emoji')
          .eq('combination_key', combinationKey)
          .single();

        if (existing) {
          // Check for conflict
          if (existing.result_element.toLowerCase() !== step.result.toLowerCase()) {
            conflicts.push({
              elementA: step.elementA,
              elementB: step.elementB,
              generated: { result: step.result, emoji: step.resultEmoji },
              existing: { result: existing.result_element, emoji: existing.result_emoji },
            });
          }
          skipped++;
          continue;
        }

        // Insert new combination
        const { error: insertError } = await supabase.from('element_combinations').insert({
          combination_key: combinationKey,
          element_a: step.elementA,
          element_b: step.elementB,
          result_element: step.result,
          result_emoji: step.resultEmoji,
          ai_generated: false,
          discovered_by: null,
        });

        if (insertError) {
          if (insertError.code === '23505') {
            skipped++;
          } else {
            errors.push(
              `Failed to save ${step.elementA} + ${step.elementB}: ${insertError.message}`
            );
          }
        } else {
          created++;
        }
      } catch (stepError) {
        errors.push(`Error processing ${step.elementA} + ${step.elementB}: ${stepError.message}`);
      }
    }

    logger.info('[ManualPathway] Pathway saved', {
      finalElement,
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
      pathway: {
        steps: completeSteps,
        finalElement,
        finalEmoji,
      },
    });
  } catch (error) {
    logger.error('[ManualPathway] Error saving pathway', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Failed to save pathway', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/daily-alchemy/manual-pathway
 * Update emojis for elements in a saved pathway
 * Body:
 * - updates: Array of { elementName, newEmoji }
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Missing required field: updates array' }, { status: 400 });
    }

    logger.info('[ManualPathway] Updating element emojis', {
      updateCount: updates.length,
    });

    const supabase = createServerClient();
    const results = { updated: 0, errors: [] };

    for (const { elementName, newEmoji } of updates) {
      if (!elementName || !newEmoji) {
        results.errors.push(`Invalid update: missing elementName or newEmoji`);
        continue;
      }

      // Update all combinations where this element is the result
      const { error: updateError, count } = await supabase
        .from('element_combinations')
        .update({ result_emoji: newEmoji.trim() })
        .ilike('result_element', elementName.trim())
        .select('id', { count: 'exact' });

      if (updateError) {
        results.errors.push(`Failed to update ${elementName}: ${updateError.message}`);
      } else {
        results.updated += count || 0;
      }
    }

    logger.info('[ManualPathway] Emoji updates completed', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('[ManualPathway] Error updating emojis', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Failed to update emojis', message: error.message },
      { status: 500 }
    );
  }
}
