import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { kv } from '@vercel/kv';
import logger from '@/lib/logger';
import aiService from '@/services/ai.service';
import { normalizeKey } from '@/lib/daily-alchemy.constants';
import { notifyFirstDiscovery } from '@/lib/discord';

// Check if KV is available
const isKvAvailable = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN &&
  !process.env.KV_REST_API_URL.includes('localhost')
);

// Cache TTLs
const COMBINATION_CACHE_TTL = 604800; // 7 days in seconds
const DISCOVERY_LOCK_TTL = 60; // 1 minute for race condition prevention

/**
 * Get today's date in YYYY-MM-DD format based on ET timezone
 */
function getCurrentPuzzleDate() {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get combination from Redis cache
 */
async function getCachedCombination(cacheKey) {
  if (!isKvAvailable) return null;

  try {
    const cached = await kv.get(`soup:combo:${cacheKey}`);
    return cached;
  } catch (error) {
    logger.error('[ElementSoup] Cache read error', { error: error.message, cacheKey });
    return null;
  }
}

/**
 * Set combination in Redis cache
 */
async function setCachedCombination(cacheKey, data) {
  if (!isKvAvailable) return;

  try {
    await kv.setex(`soup:combo:${cacheKey}`, COMBINATION_CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    logger.error('[ElementSoup] Cache write error', { error: error.message, cacheKey });
  }
}

/**
 * Try to acquire a lock for first discovery (prevents race conditions)
 */
async function tryAcquireDiscoveryLock(cacheKey) {
  if (!isKvAvailable) return true;

  try {
    // SET NX (only if not exists) with expiry
    const result = await kv.set(`soup:lock:${cacheKey}`, '1', { ex: DISCOVERY_LOCK_TTL, nx: true });
    return result === 'OK';
  } catch (error) {
    logger.error('[ElementSoup] Lock acquisition error', { error: error.message, cacheKey });
    return true; // Fail open
  }
}

/**
 * Release discovery lock
 */
async function releaseDiscoveryLock(cacheKey) {
  if (!isKvAvailable) return;

  try {
    await kv.del(`soup:lock:${cacheKey}`);
  } catch (error) {
    logger.error('[ElementSoup] Lock release error', { error: error.message, cacheKey });
  }
}

/**
 * POST /api/element-soup/combine
 * Combine two elements and get the result
 * Body:
 * - elementA: string - First element name
 * - elementB: string - Second element name
 * - userId: string (optional) - User ID for first discovery tracking
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { elementA, elementB, userId, mode = 'combine' } = body;

    // Validate required fields
    if (!elementA || !elementB) {
      return NextResponse.json(
        { error: 'Missing required fields: elementA, elementB' },
        { status: 400 }
      );
    }

    const isSubtract = mode === 'subtract';

    // Normalize the combination key
    // For combine: alphabetically sorted (A+B == B+A)
    // For subtract: order-dependent (A-B !== B-A)
    const cacheKey = isSubtract
      ? `${elementA.toLowerCase().trim()}-minus-${elementB.toLowerCase().trim()}`
      : normalizeKey(elementA, elementB);

    logger.info('[ElementSoup] Processing combination', {
      elementA,
      elementB,
      cacheKey,
      hasUser: !!userId,
    });

    // 1. Check Redis cache first (fastest)
    const cached = await getCachedCombination(cacheKey);
    if (cached) {
      const result = typeof cached === 'string' ? JSON.parse(cached) : cached;
      logger.info('[ElementSoup] Cache hit', { cacheKey, result: result.element });

      return NextResponse.json({
        success: true,
        result: {
          element: result.element,
          emoji: result.emoji,
          isFirstDiscovery: false,
        },
        cached: true,
      });
    }

    // 2. Check PostgreSQL
    const supabase = createServerClient();

    const { data: dbResult, error: dbError } = await supabase
      .from('element_combinations')
      .select('id, result_element, result_emoji, discovered_by, use_count')
      .eq('combination_key', cacheKey)
      .single();

    if (dbResult && !dbError) {
      // Found in database - update use count and cache
      logger.info('[ElementSoup] Database hit', { cacheKey, result: dbResult.result_element });

      // Update use count (fire and forget)
      supabase
        .from('element_combinations')
        .update({
          use_count: (dbResult.use_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', dbResult.id)
        .then(() => {})
        .catch((err) => logger.error('[ElementSoup] Failed to update use count', { error: err }));

      // Cache for next time
      const cacheData = {
        element: dbResult.result_element,
        emoji: dbResult.result_emoji,
      };
      await setCachedCombination(cacheKey, cacheData);

      return NextResponse.json({
        success: true,
        result: {
          element: dbResult.result_element,
          emoji: dbResult.result_emoji,
          isFirstDiscovery: false,
        },
        cached: false,
      });
    }

    // 3. Not found anywhere - generate via AI
    // Try to acquire lock to prevent duplicate AI calls
    const hasLock = await tryAcquireDiscoveryLock(cacheKey);

    if (!hasLock) {
      // Another request is processing this - wait briefly and check cache/db again
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check cache again
      const cachedAfterWait = await getCachedCombination(cacheKey);
      if (cachedAfterWait) {
        const result =
          typeof cachedAfterWait === 'string' ? JSON.parse(cachedAfterWait) : cachedAfterWait;
        return NextResponse.json({
          success: true,
          result: {
            element: result.element,
            emoji: result.emoji,
            isFirstDiscovery: false,
          },
          cached: true,
        });
      }

      // Still not found, wait longer
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      logger.info('[ElementSoup] Generating new combination via AI', {
        elementA,
        elementB,
        cacheKey,
      });

      // Generate via AI
      const aiResult = isSubtract
        ? await aiService.generateElementSubtraction(elementA, elementB)
        : await aiService.generateElementCombination(elementA, elementB);

      // Double-check DB in case another request finished first (race condition)
      const { data: raceCheck } = await supabase
        .from('element_combinations')
        .select('id, result_element, result_emoji')
        .eq('combination_key', cacheKey)
        .single();

      if (raceCheck) {
        // Another request beat us - use that result
        logger.info('[ElementSoup] Race condition resolved - using existing result', {
          cacheKey,
          result: raceCheck.result_element,
        });

        await setCachedCombination(cacheKey, {
          element: raceCheck.result_element,
          emoji: raceCheck.result_emoji,
        });

        return NextResponse.json({
          success: true,
          result: {
            element: raceCheck.result_element,
            emoji: raceCheck.result_emoji,
            isFirstDiscovery: false,
          },
          cached: false,
        });
      }

      // Check if this element name already exists (from a different combination)
      // If so, use the canonical emoji for consistency
      const { data: existingElement } = await supabase
        .from('element_combinations')
        .select('result_emoji')
        .ilike('result_element', aiResult.element)
        .limit(1)
        .single();

      // Use canonical emoji if element already exists, otherwise use AI-generated one
      const finalEmoji = existingElement?.result_emoji || aiResult.emoji;
      // Element is already discovered if we found a match (existingElement is null when no match)
      const elementAlreadyDiscovered = !!existingElement;

      // Save to database
      const { data: insertedCombo, error: insertError } = await supabase
        .from('element_combinations')
        .insert({
          combination_key: cacheKey,
          element_a: elementA,
          element_b: elementB,
          result_element: aiResult.element,
          result_emoji: finalEmoji,
          discovered_by: userId || null,
          ai_generated: true,
          ai_model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
        })
        .select('id')
        .single();

      if (insertError) {
        // If it's a unique constraint violation, another request won the race
        if (insertError.code === '23505') {
          logger.info('[ElementSoup] Unique constraint hit - fetching existing', { cacheKey });

          const { data: existing } = await supabase
            .from('element_combinations')
            .select('result_element, result_emoji')
            .eq('combination_key', cacheKey)
            .single();

          if (existing) {
            await setCachedCombination(cacheKey, {
              element: existing.result_element,
              emoji: existing.result_emoji,
            });

            return NextResponse.json({
              success: true,
              result: {
                element: existing.result_element,
                emoji: existing.result_emoji,
                isFirstDiscovery: false,
              },
              cached: false,
            });
          }
        }

        logger.error('[ElementSoup] Failed to save combination', { error: insertError });
        // Still return the AI result even if save failed
      }

      // Log first discovery if user is provided AND element wasn't already discovered by anyone
      // First discovery means this is the first time ANYONE has created this element
      let isFirstDiscovery = false;

      if (userId && insertedCombo && !elementAlreadyDiscovered) {
        isFirstDiscovery = true;

        // Get user's username for the discovery log
        // Try profiles table first, then fall back to users table
        let username = null;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        username = profileData?.username;

        // If no username in profiles, try users table
        if (!username) {
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .single();
          username = userData?.username;
        }

        // Log the first discovery
        await supabase.from('element_soup_first_discoveries').insert({
          user_id: userId,
          username: username || null,
          combination_id: insertedCombo.id,
          element_a: elementA,
          element_b: elementB,
          result_element: aiResult.element,
          result_emoji: finalEmoji,
          puzzle_date: getCurrentPuzzleDate(),
        });

        logger.info('[ElementSoup] First discovery logged', {
          userId,
          username,
          element: aiResult.element,
          from: [elementA, elementB],
        });

        // Send Discord notification (fire and forget)
        notifyFirstDiscovery({
          element: aiResult.element,
          emoji: finalEmoji,
          username,
          discoveredAt: new Date().toISOString(),
        }).catch((err) =>
          logger.error('[ElementSoup] Discord notification failed', { error: err })
        );
      }

      // Cache the result
      await setCachedCombination(cacheKey, {
        element: aiResult.element,
        emoji: finalEmoji,
      });

      logger.info('[ElementSoup] New combination generated and saved', {
        cacheKey,
        result: aiResult.element,
        isFirstDiscovery,
        elementAlreadyDiscovered,
      });

      return NextResponse.json({
        success: true,
        result: {
          element: aiResult.element,
          emoji: finalEmoji,
          isFirstDiscovery,
        },
        cached: false,
      });
    } finally {
      // Always release the lock
      await releaseDiscoveryLock(cacheKey);
    }
  } catch (error) {
    logger.error('[ElementSoup] Unexpected error in POST /api/element-soup/combine', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
