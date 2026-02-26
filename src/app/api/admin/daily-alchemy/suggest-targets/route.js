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

    const { difficulty = 'medium' } = await request.json();

    const supabase = createServerClient();

    // Load all combinations and build indexes
    const { combosByInput } = await loadCombinations(supabase);

    if (combosByInput.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No combinations found in database' },
        { status: 404 }
      );
    }

    // Forward BFS to find all reachable elements from starters
    const elementInfo = findAllReachable(combosByInput);

    // Build available elements list (exclude starters)
    const availableElements = [];
    for (const [, value] of elementInfo.entries()) {
      if (value.depth > 0) {
        availableElements.push({
          name: value.name,
          emoji: value.emoji,
          pathLength: value.depth,
        });
      }
    }

    // Fetch ALL past puzzle targets (no date limit)
    const pastTargets = await fetchAllPastTargets(supabase);
    const recentTargets = [...pastTargets];

    logger.info('[SuggestTargets] Fetched past targets', { count: recentTargets.length });

    // Generate suggestions using AI
    const result = await aiService.suggestAlchemyTargets({
      availableElements,
      recentTargets,
      difficulty,
    });

    // Enrich suggestions with solution paths
    const suggestionsWithPaths = (result.suggestions || []).map((suggestion) => {
      const elLower = suggestion.name.toLowerCase();
      if (!elementInfo.has(elLower)) {
        return { ...suggestion, path: [], pathLength: suggestion.pathLength };
      }

      const path = reconstructPath(elLower, elementInfo);
      return {
        ...suggestion,
        path,
        pathLength: path.length,
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
