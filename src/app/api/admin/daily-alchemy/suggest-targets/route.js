import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';
import logger from '@/lib/logger';

/**
 * AI Target Element Suggestion API for Daily Alchemy
 * Suggests 4-8 target elements that are already reachable from starters
 */
export async function POST(request) {
  try {
    // Apply rate limiting for AI generation (30 per hour)
    const rateLimitResponse = await withRateLimit(request, 'ai_generation');
    if (rateLimitResponse) {
      logger.warn('AI Alchemy target suggestion rate limit exceeded');
      return rateLimitResponse;
    }

    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      logger.warn('AI Alchemy target suggestion authentication failed');
      return authResult.error;
    }

    const aiEnabled = aiService.isEnabled();
    if (!aiEnabled) {
      logger.error(
        'AI generation service not enabled',
        new Error('ANTHROPIC_API_KEY not configured')
      );
      return NextResponse.json(
        {
          success: false,
          error: 'AI generation is not enabled. Please configure ANTHROPIC_API_KEY.',
        },
        { status: 503 }
      );
    }

    const { difficulty = 'medium' } = await request.json();

    const supabase = createServerClient();

    // Fetch all combinations from database (paginated)
    let allCombinations = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: combinations, error: pageError } = await supabase
        .from('element_combinations')
        .select('element_a, element_b, result_element, result_emoji')
        .not('element_a', 'eq', '_ADMIN')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (pageError) {
        logger.error('[SuggestTargets] Database error', { error: pageError.message });
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
      }

      if (combinations && combinations.length > 0) {
        allCombinations = allCombinations.concat(combinations);
        hasMore = combinations.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allCombinations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No combinations found in database' },
        { status: 404 }
      );
    }

    logger.info('[SuggestTargets] Loaded combinations', { count: allCombinations.length });

    // Build pair-to-result map for BFS
    const pairToResult = new Map();
    for (const combo of allCombinations) {
      const pair = [combo.element_a.toLowerCase(), combo.element_b.toLowerCase()].sort().join('|');
      pairToResult.set(pair, combo);
    }

    // BFS from starters to find all reachable elements with paths
    const starterNames = new Set(STARTER_ELEMENTS.map((s) => s.name.toLowerCase()));
    const elementPaths = new Map();

    for (const starter of STARTER_ELEMENTS) {
      elementPaths.set(starter.name.toLowerCase(), {
        name: starter.name,
        emoji: starter.emoji,
        pathLength: 0,
        path: [],
      });
    }

    const currentElements = new Set(starterNames);
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 100) {
      changed = false;
      iterations++;
      const elementsArray = Array.from(currentElements);

      for (let i = 0; i < elementsArray.length; i++) {
        for (let j = i; j < elementsArray.length; j++) {
          const a = elementsArray[i];
          const b = elementsArray[j];
          const pair = [a, b].sort().join('|');
          const combo = pairToResult.get(pair);
          if (!combo) continue;

          const resultKey = combo.result_element.toLowerCase();
          if (!elementPaths.has(resultKey)) {
            const dataA = elementPaths.get(a);
            const dataB = elementPaths.get(b);
            const pathA = dataA?.path || [];
            const pathB = dataB?.path || [];

            // Merge paths: start with pathA, add unique steps from pathB
            const newPath = [...pathA];
            for (const step of pathB) {
              const stepKey =
                `${step.element_a}|${step.element_b}|${step.result_element}`.toLowerCase();
              const existsInPath = newPath.some(
                (s) => `${s.element_a}|${s.element_b}|${s.result_element}`.toLowerCase() === stepKey
              );
              if (!existsInPath) {
                newPath.push(step);
              }
            }

            // Add the current combination as the final step
            newPath.push({
              element_a: combo.element_a,
              element_b: combo.element_b,
              result_element: combo.result_element,
              result_emoji: combo.result_emoji,
            });

            elementPaths.set(resultKey, {
              name: combo.result_element,
              emoji: combo.result_emoji,
              pathLength: newPath.length,
              path: newPath,
            });
            currentElements.add(resultKey);
            changed = true;
          }
        }
      }
    }

    // Build available elements list (exclude starters)
    const availableElements = [];
    for (const [key, value] of elementPaths.entries()) {
      if (!starterNames.has(key)) {
        availableElements.push(value);
      }
    }

    logger.info('[SuggestTargets] BFS complete', {
      reachableElements: availableElements.length,
      iterations,
    });

    // Fetch recent puzzle targets (last 60 days)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 60);
    const { data: recentPuzzles } = await supabase
      .from('element_soup_puzzles')
      .select('target_element')
      .gte('date', pastDate.toISOString().split('T')[0]);

    const recentTargets = [
      ...new Set((recentPuzzles || []).map((p) => p.target_element).filter(Boolean)),
    ];

    logger.info('[SuggestTargets] Fetched recent targets', { count: recentTargets.length });

    // Generate suggestions using AI
    const result = await aiService.suggestAlchemyTargets({
      availableElements,
      recentTargets,
      difficulty,
    });

    // Enrich suggestions with solution paths from BFS
    const suggestionsWithPaths = (result.suggestions || []).map((suggestion) => {
      const elementData = elementPaths.get(suggestion.name.toLowerCase());
      return {
        ...suggestion,
        path: elementData?.path || [],
        pathLength: elementData?.pathLength || suggestion.pathLength,
      };
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestionsWithPaths,
      availableElementCount: availableElements.length,
    });
  } catch (error) {
    logger.error('AI Alchemy target suggestion error:', error);

    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service rate limit reached. Please try again in a moment.',
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('authentication') || error.message?.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'AI service authentication error. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
