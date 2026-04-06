/**
 * Puzzle Suggestion Generator Service
 *
 * Generates complete puzzle options for all 4 games to be reviewed by admins.
 * Called by the morning cron job (/api/cron/generate-suggestions).
 *
 * Generation counts per game:
 * - Daily Tandem: 3 options (theme + 4 emoji/answer pairs + difficulty)
 * - Daily Mini: 4 options (5x5 grid + clues)
 * - Daily Alchemy: 3 options (target + path + par)
 * - Reel Connections: 2 options (4 groups + 16 verified movies)
 */

import { createClient } from '@supabase/supabase-js';
import aiService from '@/services/ai.service';
import { getPuzzlesRange } from '@/lib/db';
import { extractWordsFromPuzzles } from '@/lib/miniUtils';
import {
  loadCombinations,
  findAllReachable,
  reconstructPath,
  fetchAllPastTargets,
} from '@/lib/server/alchemyPathfinder';
import logger from '@/lib/logger';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

const GENERATION_COUNTS = {
  tandem: 3,
  mini: 4,
  soup: 3,
  reel: 2,
};

// Movie deduplication lookback (days)
const REEL_MOVIE_LOOKBACK_DAYS = 45;

// Mini word deduplication
const MINI_DEDUP_LOOKBACK_DAYS = 30;
const MINI_EXCLUSION_PERCENTAGE = 0.8;

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// =============================================================================
// Daily Tandem Generator
// =============================================================================

async function generateTandemOptions(targetDate) {
  const options = [];
  const startTime = Date.now();

  // Fetch all historical themes to avoid
  let allThemes = [];
  try {
    const startDateStr = '2020-01-01';
    const endDateStr = new Date().toISOString().split('T')[0];
    const puzzlesData = await getPuzzlesRange(startDateStr, endDateStr);
    if (puzzlesData) {
      allThemes = [
        ...new Set(
          Object.values(puzzlesData)
            .map((p) => p.theme)
            .filter(Boolean)
        ),
      ];
    }
  } catch (err) {
    logger.error('[SuggestionGen] Error fetching tandem themes:', err);
  }

  for (let i = 0; i < GENERATION_COUNTS.tandem; i++) {
    try {
      logger.info(`[SuggestionGen] Generating Tandem option ${i + 1}/${GENERATION_COUNTS.tandem}`);

      // Include themes from already-generated options this run
      const generatedThemes = options.map((o) => o.theme).filter(Boolean);
      const excludeThemes = [...allThemes, ...generatedThemes];

      // Generate a full puzzle (theme + 4 emoji pairs + answers)
      const puzzle = await aiService.generatePuzzle({
        date: targetDate,
        pastPuzzles: [],
        excludeThemes,
      });

      // Assess difficulty
      let difficulty = null;
      try {
        difficulty = await aiService.assessDifficulty({
          theme: puzzle.theme,
          puzzles: puzzle.puzzles,
        });
      } catch (err) {
        logger.warn('[SuggestionGen] Difficulty assessment failed for Tandem option', {
          option: i + 1,
          error: err.message,
        });
      }

      // Quality checks
      const qualityNotes = [];
      const answers = puzzle.puzzles.map((p) => p.answer?.toLowerCase());
      const uniqueAnswers = new Set(answers);
      if (uniqueAnswers.size < 4) {
        qualityNotes.push('WARNING: Duplicate answers detected');
      }
      if (puzzle.puzzles.some((p) => !p.emoji || !p.answer)) {
        qualityNotes.push('WARNING: Missing emoji or answer');
      }
      if (allThemes.some((t) => t.toLowerCase() === puzzle.theme?.toLowerCase())) {
        qualityNotes.push('WARNING: Theme may have been used before');
      }

      const qualityScore = calculateTandemQuality(puzzle, difficulty, qualityNotes);

      options.push({
        theme: puzzle.theme,
        puzzles: puzzle.puzzles,
        difficultyRating: difficulty?.rating || null,
        difficultyFactors: difficulty?.factors || null,
        qualityScore,
        qualityNotes,
      });
    } catch (err) {
      logger.error(`[SuggestionGen] Tandem option ${i + 1} failed:`, err);
      options.push({
        error: err.message,
        qualityScore: 0,
        qualityNotes: [`FAILED: ${err.message}`],
      });
    }
  }

  logger.info('[SuggestionGen] Tandem generation complete', {
    successful: options.filter((o) => !o.error).length,
    total: GENERATION_COUNTS.tandem,
    elapsed: Date.now() - startTime,
  });

  return options;
}

function calculateTandemQuality(puzzle, difficulty, qualityNotes) {
  let score = 7.0; // Base score

  // Penalize quality issues
  score -= qualityNotes.filter((n) => n.startsWith('WARNING')).length * 1.5;

  // Bonus for having difficulty assessment
  if (difficulty?.rating) score += 0.5;

  // Bonus for medium difficulty (most fun)
  if (difficulty?.rating === 'medium') score += 0.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

// =============================================================================
// Daily Mini Generator
// =============================================================================

// eslint-disable-next-line no-unused-vars
async function generateMiniOptions(targetDate) {
  const options = [];
  const startTime = Date.now();
  const supabase = getSupabase();

  // Fetch recently used words
  let excludeWords = [];
  try {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - MINI_DEDUP_LOOKBACK_DAYS);
    const startDateStr = lookbackDate.toISOString().split('T')[0];

    const { data: recentPuzzles } = await supabase
      .from('mini_puzzles')
      .select('solution')
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (recentPuzzles) {
      const allWords = extractWordsFromPuzzles(recentPuzzles);
      const shuffled = allWords.sort(() => Math.random() - 0.5);
      excludeWords = shuffled.slice(0, Math.ceil(shuffled.length * MINI_EXCLUSION_PERCENTAGE));
    }
  } catch (err) {
    logger.error('[SuggestionGen] Error fetching mini words:', err);
  }

  for (let i = 0; i < GENERATION_COUNTS.mini; i++) {
    try {
      logger.info(`[SuggestionGen] Generating Mini option ${i + 1}/${GENERATION_COUNTS.mini}`);

      const result = await aiService.generateMiniCrossword({ excludeWords });

      // Build display grid (empty cells except black squares)
      const displayGrid = result.grid.map((row) => row.map((cell) => (cell === '■' ? '■' : '')));

      // Quality checks
      const qualityNotes = [];
      if (!result.words || result.words.length < 5) {
        qualityNotes.push('WARNING: Fewer than expected words placed');
      }
      if (!result.clues?.across?.length || !result.clues?.down?.length) {
        qualityNotes.push('WARNING: Missing clues');
      }

      const qualityScore = calculateMiniQuality(result, qualityNotes);

      options.push({
        grid: displayGrid,
        solution: result.solution,
        words: result.words,
        clues: result.clues,
        qualityScore,
        qualityNotes,
      });
    } catch (err) {
      logger.error(`[SuggestionGen] Mini option ${i + 1} failed:`, err);
      options.push({
        error: err.message,
        qualityScore: 0,
        qualityNotes: [`FAILED: ${err.message}`],
      });
    }
  }

  logger.info('[SuggestionGen] Mini generation complete', {
    successful: options.filter((o) => !o.error).length,
    total: GENERATION_COUNTS.mini,
    elapsed: Date.now() - startTime,
  });

  return options;
}

function calculateMiniQuality(result, qualityNotes) {
  let score = 7.0;
  score -= qualityNotes.filter((n) => n.startsWith('WARNING')).length * 1.5;
  if (result.words?.length >= 6) score += 0.5;
  if (result.clues?.across?.length && result.clues?.down?.length) score += 0.5;
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

// =============================================================================
// Daily Alchemy Generator
// =============================================================================

// eslint-disable-next-line no-unused-vars
async function generateAlchemyOptions(targetDate) {
  const options = [];
  const startTime = Date.now();
  const supabase = getSupabase();

  // Load combinations and find reachable elements
  let elementInfo;
  let combosByInput;
  let pastTargetSet;

  try {
    const combos = await loadCombinations(supabase);
    combosByInput = combos.combosByInput;
    elementInfo = findAllReachable(combosByInput, combos.pairToResult);

    const pastTargets = await fetchAllPastTargets(supabase);
    pastTargetSet = new Set([...pastTargets].map((t) => t.toLowerCase()));
  } catch (err) {
    logger.error('[SuggestionGen] Error loading alchemy data:', err);
    return [{ error: err.message, qualityScore: 0, qualityNotes: [`FAILED: ${err.message}`] }];
  }

  // Build available elements (exclude starters, past targets, and paths > 50 steps)
  const MAX_PATH_STEPS = 50;
  const availableElements = [];
  for (const [key, value] of elementInfo.entries()) {
    if (value.depth > 0 && !pastTargetSet.has(key)) {
      const path = reconstructPath(key, elementInfo);
      if (path.length <= MAX_PATH_STEPS) {
        availableElements.push({
          name: value.name,
          emoji: value.emoji,
          pathLength: path.length,
        });
      }
    }
  }

  // Generate suggestions at varying difficulties for variety
  const difficulties = ['easy', 'medium', 'hard'];

  for (let i = 0; i < GENERATION_COUNTS.soup; i++) {
    try {
      const difficulty = difficulties[i % difficulties.length];
      logger.info(
        `[SuggestionGen] Generating Alchemy option ${i + 1}/${GENERATION_COUNTS.soup} (${difficulty})`
      );

      // Get AI target suggestions
      const targetResult = await aiService.suggestAlchemyTargets({
        availableElements,
        recentTargets: [...pastTargetSet],
        difficulty,
      });

      if (!targetResult.suggestions || targetResult.suggestions.length === 0) {
        throw new Error('No target suggestions returned');
      }

      // Pick the first suggestion
      const target = targetResult.suggestions[0];

      // Get the BFS path for this target
      const elLower = target.name.toLowerCase();
      const path = elementInfo.has(elLower) ? reconstructPath(elLower, elementInfo) : [];

      // Hard limit: never produce puzzles exceeding 50 steps
      if (path.length > MAX_PATH_STEPS) {
        throw new Error(
          `Path for "${target.name}" is ${path.length} steps (max ${MAX_PATH_STEPS})`
        );
      }

      // Calculate par: shortest path * 1.25, rounded up
      const shortestPathLength = path.length;
      const parMoves = Math.ceil(shortestPathLength * 1.25);

      // Quality checks
      const qualityNotes = [];
      if (path.length === 0) {
        qualityNotes.push('WARNING: No valid path found from starters');
      }
      if (path.length > 15) {
        qualityNotes.push('WARNING: Path exceeds 15 steps (may be too long)');
      }
      if (parMoves < 2) {
        qualityNotes.push('WARNING: Par is too low (trivial puzzle)');
      }

      // Build solution path in puzzle format
      const solutionPath = path.map((step, idx) => ({
        step: idx + 1,
        elementA: step.element_a,
        elementAEmoji: step.result_emoji, // Will be corrected below
        elementB: step.element_b,
        elementBEmoji: step.result_emoji,
        result: step.result_element,
        emoji: step.result_emoji,
      }));

      const qualityScore = calculateAlchemyQuality(path, parMoves, difficulty, qualityNotes);

      options.push({
        targetElement: target.name,
        targetEmoji: target.emoji,
        difficulty,
        parMoves,
        shortestPathLength,
        solutionPath,
        description: target.description,
        qualityScore,
        qualityNotes,
      });
    } catch (err) {
      logger.error(`[SuggestionGen] Alchemy option ${i + 1} failed:`, err);
      options.push({
        error: err.message,
        qualityScore: 0,
        qualityNotes: [`FAILED: ${err.message}`],
      });
    }
  }

  logger.info('[SuggestionGen] Alchemy generation complete', {
    successful: options.filter((o) => !o.error).length,
    total: GENERATION_COUNTS.soup,
    elapsed: Date.now() - startTime,
  });

  return options;
}

function calculateAlchemyQuality(path, parMoves, difficulty, qualityNotes) {
  let score = 7.0;
  score -= qualityNotes.filter((n) => n.startsWith('WARNING')).length * 2.0;

  // Reward reasonable path lengths by difficulty
  if (difficulty === 'easy' && path.length >= 3 && path.length <= 5) score += 1.0;
  if (difficulty === 'medium' && path.length >= 5 && path.length <= 8) score += 1.0;
  if (difficulty === 'hard' && path.length >= 7 && path.length <= 12) score += 1.0;

  if (parMoves >= 3 && parMoves <= 15) score += 0.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

// =============================================================================
// Reel Connections Generator
// =============================================================================

// eslint-disable-next-line no-unused-vars
async function generateReelOptions(targetDate) {
  const options = [];
  const startTime = Date.now();
  const supabase = getSupabase();

  // Fetch historical connections
  let allConnections = [];
  let recentConnections = [];
  let recentMovieTitles = [];

  try {
    const { data: allGroups } = await supabase
      .from('reel_connections_groups')
      .select('connection, puzzle:reel_connections_puzzles!inner(date)')
      .order('puzzle(date)', { ascending: false });

    if (allGroups) {
      allConnections = [...new Set(allGroups.map((g) => g.connection).filter(Boolean))];

      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - 90);
      const lookbackStr = lookbackDate.toISOString().split('T')[0];

      recentConnections = [
        ...new Set(
          allGroups
            .filter((g) => g.puzzle?.date >= lookbackStr)
            .map((g) => g.connection)
            .filter(Boolean)
        ),
      ];
    }

    // Fetch movies used in last 45 days to avoid
    const movieLookbackDate = new Date();
    movieLookbackDate.setDate(movieLookbackDate.getDate() - REEL_MOVIE_LOOKBACK_DAYS);
    const movieLookbackStr = movieLookbackDate.toISOString().split('T')[0];

    const { data: recentMovies } = await supabase
      .from('reel_connections_movies')
      .select(
        'title, group:reel_connections_groups!inner(puzzle:reel_connections_puzzles!inner(date))'
      )
      .gte('group.puzzle.date', movieLookbackStr);

    if (recentMovies) {
      recentMovieTitles = [...new Set(recentMovies.map((m) => m.title).filter(Boolean))];
    }
  } catch (err) {
    logger.error('[SuggestionGen] Error fetching reel history:', err);
  }

  // Fetch all past movies for overuse detection
  let pastMovies = [];
  try {
    const { data } = await supabase.from('reel_connections_movies').select('title');
    if (data) {
      const counts = {};
      for (const row of data) {
        if (row.title) counts[row.title] = (counts[row.title] || 0) + 1;
      }
      pastMovies = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([title, count]) => ({ title, count }));
    }
  } catch (err) {
    logger.warn('[SuggestionGen] Error fetching past movies:', err);
  }

  const overusedMovies = pastMovies.filter((m) => m.count >= 2).map((m) => m.title);
  const allPastTitles = pastMovies.map((m) => m.title);

  for (let i = 0; i < GENERATION_COUNTS.reel; i++) {
    try {
      logger.info(`[SuggestionGen] Generating Reel option ${i + 1}/${GENERATION_COUNTS.reel}`);

      // Include connections from already-generated options this run
      const generatedConnections = options
        .filter((o) => !o.error && o.groups)
        .flatMap((o) => o.groups.map((g) => g.connection));
      const dismissed = [...generatedConnections];

      // Get full puzzle suggestion (4 connections)
      const suggestion = await aiService.suggestFullReelConnectionsPuzzle({
        recentConnections,
        allConnections: [...allConnections, ...generatedConnections],
        dismissedConnections: dismissed,
      });

      if (!suggestion.groups || suggestion.groups.length < 4) {
        throw new Error('Incomplete puzzle suggestion (need 4 groups)');
      }

      // Generate and verify movies for each connection
      const groups = [];
      const qualityNotes = [];
      let allMoviesVerified = true;

      for (const group of suggestion.groups) {
        try {
          const aiResult = await aiService.generateReelConnectionsMovies({
            connection: group.connection,
            difficulty: group.difficulty,
            overusedMovies,
            allPastMovies: [...allPastTitles, ...recentMovieTitles],
          });

          // Verify movies via OMDb
          const verifiedMovies = [];
          const failedMovies = [];

          for (const movieTitle of aiResult.movies) {
            try {
              const searchResponse = await fetch(
                `${OMDB_BASE_URL}?s=${encodeURIComponent(movieTitle)}&type=movie&apikey=${OMDB_API_KEY}`
              );
              const searchData = await searchResponse.json();

              if (
                searchData.Response === 'False' ||
                !searchData.Search ||
                searchData.Search.length === 0
              ) {
                failedMovies.push({ title: movieTitle, reason: 'Not found' });
                continue;
              }

              const movie = searchData.Search[0];
              if (!movie.Poster || movie.Poster === 'N/A') {
                failedMovies.push({ title: movieTitle, reason: 'No poster' });
                continue;
              }

              // Check if movie was used in last 45 days
              if (recentMovieTitles.includes(movie.Title)) {
                qualityNotes.push(`NOTE: "${movie.Title}" used in last 45 days`);
              }

              verifiedMovies.push({
                imdbId: movie.imdbID,
                title: movie.Title,
                year: movie.Year,
                poster: movie.Poster,
              });
            } catch (fetchErr) {
              failedMovies.push({ title: movieTitle, reason: fetchErr.message });
            }
          }

          if (verifiedMovies.length < 4) {
            qualityNotes.push(
              `WARNING: ${group.connection} - only ${verifiedMovies.length}/4 movies verified`
            );
            allMoviesVerified = false;
          }

          groups.push({
            connection: group.connection,
            difficulty: group.difficulty,
            description: group.description,
            movies: verifiedMovies.slice(0, 4),
            failedMovies: failedMovies.length > 0 ? failedMovies : undefined,
          });
        } catch (groupErr) {
          logger.error(`[SuggestionGen] Reel group "${group.connection}" failed:`, groupErr);
          qualityNotes.push(`WARNING: Group "${group.connection}" generation failed`);
          groups.push({
            connection: group.connection,
            difficulty: group.difficulty,
            description: group.description,
            movies: [],
            error: groupErr.message,
          });
          allMoviesVerified = false;
        }
      }

      // Check for duplicate movies across groups
      const allTitles = groups.flatMap((g) => (g.movies || []).map((m) => m.title));
      const titleSet = new Set();
      for (const title of allTitles) {
        if (titleSet.has(title)) {
          qualityNotes.push(`WARNING: Duplicate movie "${title}" across groups`);
        }
        titleSet.add(title);
      }

      const qualityScore = calculateReelQuality(groups, allMoviesVerified, qualityNotes);

      options.push({
        groups,
        allMoviesVerified,
        qualityScore,
        qualityNotes,
      });
    } catch (err) {
      logger.error(`[SuggestionGen] Reel option ${i + 1} failed:`, err);
      options.push({
        error: err.message,
        qualityScore: 0,
        qualityNotes: [`FAILED: ${err.message}`],
      });
    }
  }

  logger.info('[SuggestionGen] Reel generation complete', {
    successful: options.filter((o) => !o.error).length,
    total: GENERATION_COUNTS.reel,
    elapsed: Date.now() - startTime,
  });

  return options;
}

function calculateReelQuality(groups, allMoviesVerified, qualityNotes) {
  let score = 7.0;
  score -= qualityNotes.filter((n) => n.startsWith('WARNING')).length * 1.0;
  if (allMoviesVerified) score += 1.5;

  // Check difficulty spread
  const difficulties = groups.map((g) => g.difficulty);
  const hasFullSpread =
    difficulties.includes('easiest') &&
    difficulties.includes('easy') &&
    difficulties.includes('medium') &&
    difficulties.includes('hardest');
  if (hasFullSpread) score += 0.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

// =============================================================================
// Main Orchestrator
// =============================================================================

/**
 * Store generated options in the puzzle_suggestions table
 */
async function storeSuggestions(supabase, targetDate, puzzleType, options) {
  const rows = options.map((option, idx) => ({
    target_date: targetDate,
    puzzle_type: puzzleType,
    option_number: idx + 1,
    puzzle_data: option,
    quality_score: option.qualityScore || 0,
    quality_notes: option.qualityNotes || [],
    status: 'pending',
  }));

  const { error } = await supabase.from('puzzle_suggestions').upsert(rows, {
    onConflict: 'target_date,puzzle_type,option_number',
  });

  if (error) {
    logger.error(`[SuggestionGen] Error storing ${puzzleType} suggestions:`, error);
    throw error;
  }

  logger.info(`[SuggestionGen] Stored ${rows.length} ${puzzleType} suggestions for ${targetDate}`);
}

/**
 * Generate all puzzle suggestions for a target date.
 * Runs all 4 games in parallel.
 *
 * @param {string} targetDate - YYYY-MM-DD date to generate for
 * @param {Object} options - Generation options
 * @param {string[]} options.games - Specific games to generate (default: all)
 * @param {boolean} options.force - Regenerate even if suggestions exist
 * @returns {Object} Results per game
 */
export async function generateAllSuggestions(targetDate, { games, force = false } = {}) {
  const supabase = getSupabase();
  const startTime = Date.now();
  const gamesToGenerate = games || ['tandem', 'mini', 'soup', 'reel'];

  logger.info('[SuggestionGen] Starting suggestion generation', {
    targetDate,
    games: gamesToGenerate,
    force,
  });

  // Check for existing suggestions unless forcing
  if (!force) {
    const { data: existing } = await supabase
      .from('puzzle_suggestions')
      .select('puzzle_type')
      .eq('target_date', targetDate)
      .eq('status', 'pending');

    if (existing && existing.length > 0) {
      const existingTypes = [...new Set(existing.map((e) => e.puzzle_type))];
      const remaining = gamesToGenerate.filter((g) => !existingTypes.includes(g));

      if (remaining.length === 0) {
        logger.info('[SuggestionGen] All suggestions already exist for date', { targetDate });
        return { skipped: true, existingTypes };
      }

      // Only generate for games that don't have suggestions yet
      logger.info('[SuggestionGen] Partial suggestions exist, generating remaining', {
        existing: existingTypes,
        remaining,
      });
      gamesToGenerate.length = 0;
      gamesToGenerate.push(...remaining);
    }
  } else {
    // Force mode: delete existing suggestions for these games
    await supabase
      .from('puzzle_suggestions')
      .delete()
      .eq('target_date', targetDate)
      .in('puzzle_type', gamesToGenerate);
  }

  // Generate all games in parallel
  const generators = {
    tandem: generateTandemOptions,
    mini: generateMiniOptions,
    soup: generateAlchemyOptions,
    reel: generateReelOptions,
  };

  const results = {};
  const promises = gamesToGenerate.map(async (game) => {
    try {
      const generator = generators[game];
      if (!generator) {
        throw new Error(`Unknown game type: ${game}`);
      }

      const options = await generator(targetDate);
      await storeSuggestions(supabase, targetDate, game, options);

      results[game] = {
        success: true,
        count: options.length,
        successful: options.filter((o) => !o.error).length,
      };
    } catch (err) {
      logger.error(`[SuggestionGen] ${game} generation failed entirely:`, err);
      results[game] = {
        success: false,
        error: err.message,
      };
    }
  });

  await Promise.all(promises);

  const elapsed = Date.now() - startTime;
  logger.info('[SuggestionGen] All generation complete', {
    targetDate,
    elapsed,
    results,
  });

  return { targetDate, results, elapsed };
}

export { GENERATION_COUNTS };
