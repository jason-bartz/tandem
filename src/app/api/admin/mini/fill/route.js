import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import CrosswordGenerator from '@/lib/server/CrosswordGenerator';
import { getWordIndex } from '@/lib/server/WordIndex';
import { createServerClient } from '@/lib/supabase/server';
import { extractWordsFromPuzzles } from '@/lib/miniUtils';
import aiService from '@/services/ai.service';
import logger from '@/lib/logger';

export const dynamic = process.env.BUILD_TARGET === 'capacitor' ? 'auto' : 'force-dynamic';

const DEDUP_LOOKBACK_DAYS = 30;
const EXCLUSION_PERCENTAGE = 0.8;

/**
 * Fetch recently used words to exclude from fills
 */
async function getRecentlyUsedWords(lookbackDays = DEDUP_LOOKBACK_DAYS) {
  try {
    const supabase = createServerClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: puzzles, error } = await supabase
      .from('mini_puzzles')
      .select('solution')
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      logger.error('[Fill API] Error fetching recent puzzles:', error);
      return [];
    }

    const allWords = extractWordsFromPuzzles(puzzles);
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    const excludeCount = Math.ceil(shuffled.length * EXCLUSION_PERCENTAGE);
    return shuffled.slice(0, excludeCount);
  } catch (error) {
    logger.error('[Fill API] Error in getRecentlyUsedWords:', error);
    return [];
  }
}

/**
 * POST /api/admin/mini/fill
 *
 * Actions:
 * - candidates: Get scored candidate words for a specific slot
 * - quickfill: Auto-fill the grid with randomness
 * - bestlocation: Find the most constrained unfilled slot
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { action, grid, slotId, minScore = 25, options = {} } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    if (!grid || !Array.isArray(grid) || grid.length !== 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid grid: must be 5x5 array' },
        { status: 400 }
      );
    }

    // Load word index and get excluded words
    const wordIndex = getWordIndex();
    const excludeWords = options.excludeWords || [];

    // Add recently used words to exclusion list
    let recentWords = [];
    try {
      recentWords = await getRecentlyUsedWords();
    } catch (err) {
      logger.warn('[Fill API] Could not fetch recent words:', err.message);
    }

    const allExcluded = [...excludeWords, ...recentWords];

    const generator = new CrosswordGenerator(wordIndex, {
      minScore,
      excludeWords: allExcluded,
      timeoutMs: 5000,
    });

    switch (action) {
      case 'candidates': {
        if (!slotId) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: slotId' },
            { status: 400 }
          );
        }

        const result = generator.getCandidatesForSlot(grid, slotId, {
          computeGridScore: options.computeGridScore !== false,
        });

        return NextResponse.json({
          success: true,
          status: 'ready',
          slot: result.slot,
          candidates: result.candidates,
          totalCandidates: result.totalCandidates,
          viableCandidates: result.candidates.filter((c) => c.viable).length,
          elapsedMs: Date.now() - startTime,
        });
      }

      case 'quickfill': {
        const result = generator.quickFill(grid, {
          minScore,
          excludeWords: allExcluded,
        });

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Could not complete fill',
            elapsedMs: Date.now() - startTime,
          });
        }

        return NextResponse.json({
          success: true,
          solution: result.solution,
          words: result.words,
          qualityScore: result.qualityScore,
          averageWordScore: result.averageWordScore,
          elapsedMs: result.elapsedMs,
        });
      }

      case 'evaluate': {
        const result = generator.evaluateGrid(grid);
        return NextResponse.json({
          success: true,
          quality: result.quality,
          elapsedMs: Date.now() - startTime,
        });
      }

      case 'bestlocation': {
        const result = generator.findBestLocation(grid);

        if (!result) {
          return NextResponse.json({
            success: true,
            slot: null,
            reason: 'All slots are filled',
          });
        }

        return NextResponse.json({
          success: true,
          slot: result.slot,
          domainSize: result.domainSize,
          reason: result.reason,
        });
      }

      case 'themeseed': {
        const { theme } = body;
        if (!theme || typeof theme !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Missing required field: theme' },
            { status: 400 }
          );
        }

        if (!aiService.isEnabled()) {
          return NextResponse.json(
            { success: false, error: 'AI service is not enabled. Configure ANTHROPIC_API_KEY.' },
            { status: 503 }
          );
        }

        // Generate seed words from AI
        const aiResult = await aiService.generateThemeSeedWords({
          theme,
          excludeWords: allExcluded,
        });

        // Validate each word against the master dictionary
        const wordIndex = getWordIndex();
        const validated = aiResult.seedWords.map((word) => ({
          word,
          inDictionary: wordIndex.has(word),
          score: wordIndex.getScore(word),
        }));

        const validWords = validated.filter((w) => w.inDictionary);
        const invalidWords = validated.filter((w) => !w.inDictionary);

        return NextResponse.json({
          success: true,
          theme: aiResult.theme,
          seedWords: validated,
          validCount: validWords.length,
          invalidCount: invalidWords.length,
          elapsedMs: Date.now() - startTime,
        });
      }

      case 'themedFill': {
        // Generate a complete themed puzzle: AI seeds + CSP fill
        const { theme: fillTheme } = body;
        if (!fillTheme || typeof fillTheme !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Missing required field: theme' },
            { status: 400 }
          );
        }

        if (!aiService.isEnabled()) {
          return NextResponse.json(
            { success: false, error: 'AI service is not enabled. Configure ANTHROPIC_API_KEY.' },
            { status: 503 }
          );
        }

        // Step 1: Get theme seed words from AI
        const seedResult = await aiService.generateThemeSeedWords({
          theme: fillTheme,
          excludeWords: allExcluded,
        });

        // Step 2: Validate against dictionary
        const idx = getWordIndex();
        const validSeeds = seedResult.seedWords.filter((w) => idx.has(w));

        if (validSeeds.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No valid dictionary words generated for this theme. Try a different theme.',
            seedWords: seedResult.seedWords.map((w) => ({ word: w, inDictionary: idx.has(w) })),
            elapsedMs: Date.now() - startTime,
          });
        }

        // Step 3: Try placing seed words and filling with CSP
        // Try multiple placements to find one that works
        let bestResult = null;

        for (let attempt = 0; attempt < 5; attempt++) {
          // Build a seed grid: place the longest valid seed word first, then try others
          const seedGrid = Array.from({ length: 5 }, () => Array(5).fill(''));
          const shuffledSeeds = [...validSeeds].sort(() => Math.random() - 0.5);
          const placedSeeds = [];

          // Try to place seed words across row 0, down col 0, etc.
          const placements = [
            { direction: 'across', row: 0, col: 0 },
            { direction: 'down', row: 0, col: 0 },
            { direction: 'across', row: 2, col: 0 },
            { direction: 'across', row: 4, col: 0 },
            { direction: 'down', row: 0, col: 4 },
          ];

          for (const seed of shuffledSeeds) {
            for (const placement of placements) {
              // Check if this placement is already used
              if (
                placedSeeds.some(
                  (p) =>
                    p.row === placement.row &&
                    p.col === placement.col &&
                    p.direction === placement.direction
                )
              ) {
                continue;
              }

              // Check if seed fits in this placement
              if (seed.length !== 5) continue; // Only place 5-letter words in full rows/cols for now

              let canPlace = true;
              for (let i = 0; i < seed.length; i++) {
                const r = placement.direction === 'across' ? placement.row : placement.row + i;
                const c = placement.direction === 'across' ? placement.col + i : placement.col;
                if (r >= 5 || c >= 5) {
                  canPlace = false;
                  break;
                }
                const existing = seedGrid[r][c];
                if (existing && existing !== '' && existing !== seed[i]) {
                  canPlace = false;
                  break;
                }
              }

              if (canPlace) {
                for (let i = 0; i < seed.length; i++) {
                  const r = placement.direction === 'across' ? placement.row : placement.row + i;
                  const c = placement.direction === 'across' ? placement.col + i : placement.col;
                  seedGrid[r][c] = seed[i];
                }
                placedSeeds.push({ word: seed, ...placement });
                break;
              }
            }
          }

          if (placedSeeds.length === 0) continue;

          // Try to fill around the seed words
          const fillGen = new CrosswordGenerator(idx, {
            minScore,
            excludeWords: allExcluded,
            timeoutMs: 5000,
          });

          const fillResult = fillGen.quickFill(seedGrid, {
            minScore,
            excludeWords: allExcluded,
          });

          if (fillResult.success) {
            bestResult = {
              ...fillResult,
              seedWords: placedSeeds,
              theme: fillTheme,
            };
            break;
          }
        }

        if (!bestResult) {
          return NextResponse.json({
            success: false,
            error: 'Could not fill grid with theme words. Try a different theme or use Quick Fill.',
            seedWords: validSeeds.map((w) => ({
              word: w,
              inDictionary: true,
              score: idx.getScore(w),
            })),
            elapsedMs: Date.now() - startTime,
          });
        }

        return NextResponse.json({
          success: true,
          solution: bestResult.solution,
          words: bestResult.words,
          seedWords: bestResult.seedWords,
          theme: bestResult.theme,
          qualityScore: bestResult.qualityScore,
          averageWordScore: bestResult.averageWordScore,
          elapsedMs: Date.now() - startTime,
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Use: candidates, quickfill, evaluate, bestlocation, themeseed, themedFill`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('[Fill API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fill engine error',
        elapsedMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
