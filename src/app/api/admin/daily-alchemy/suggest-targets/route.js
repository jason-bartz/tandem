import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import aiService from '@/services/ai.service';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';
import {
  loadCombinations,
  findAllReachable,
  reconstructPath,
  fetchAllPastTargets,
} from '@/lib/server/alchemyPathfinder';

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

    // difficulty param no longer used for filtering — suggestions span all tiers
    await request.json();

    const supabase = createServerClient();

    // Load all combinations and build indexes
    const { combosByInput, pairToResult } = await loadCombinations(supabase);

    if (combosByInput.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No combinations found in database' },
        { status: 404 }
      );
    }

    // Forward BFS to find all reachable elements from starters
    const elementInfo = findAllReachable(combosByInput, pairToResult);

    // Fetch ALL past puzzle targets (no date limit)
    const pastTargets = await fetchAllPastTargets(supabase);
    const pastTargetSet = new Set([...pastTargets].map((t) => t.toLowerCase()));

    logger.info('[SuggestTargets] Fetched past targets', { count: pastTargetSet.size });

    // Build available elements list (exclude starters, past targets, and paths > 50 steps).
    // pathLength must be the actual reconstructed path length — BFS depth undercounts
    // dramatically because reconstructPath pulls in every prerequisite subtree.
    const MAX_PATH_STEPS = 50;
    const availableElements = [];
    for (const [key, value] of elementInfo.entries()) {
      if (value.depth > 0 && !pastTargetSet.has(key)) {
        const path = reconstructPath(key, elementInfo);
        if (path.length > 0 && path.length <= MAX_PATH_STEPS) {
          availableElements.push({
            name: value.name,
            emoji: value.emoji,
            pathLength: path.length,
          });
        }
      }
    }

    logger.info('[SuggestTargets] Available candidates after filtering', {
      total: elementInfo.size,
      afterFilter: availableElements.length,
      pastTargetsExcluded: pastTargetSet.size,
    });

    // Generate suggestions using AI (spans all difficulty tiers)
    const result = await aiService.suggestAlchemyTargets({
      availableElements,
      recentTargets: [...pastTargets],
    });

    // Enrich suggestions with solution paths (keep original pathLength for tier display)
    const suggestionsWithPaths = (result.suggestions || []).map((suggestion) => {
      const elLower = suggestion.name.toLowerCase();
      if (!elementInfo.has(elLower)) {
        return { ...suggestion, path: [] };
      }

      const path = reconstructPath(elLower, elementInfo);
      return {
        ...suggestion,
        path,
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
