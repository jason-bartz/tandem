/**
 * Bot Leaderboard Service
 *
 * Generates synthetic leaderboard entries to create the illusion of more active players.
 * Bots have realistic usernames and scores, and submissions are spread throughout the day.
 */

import { generateRealisticUsername } from '@/utils/realisticUsernameGenerator';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

/**
 * Generate a simple hash from a string
 * Used for deterministic avatar assignment based on username
 *
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic avatar ID for a username
 * Same username always gets the same avatar across all games
 *
 * @param {string} username - Bot username
 * @param {Array<{id: string}>} avatars - Available avatars
 * @returns {string} Avatar ID
 */
function getAvatarForUsername(username, avatars) {
  const hash = simpleHash(username);
  const index = hash % avatars.length;
  return avatars[index].id;
}

/**
 * Generate a realistic score for a given game type
 * Uses a weighted distribution to favor mid-range scores
 *
 * @param {string} gameType - Game type (tandem, cryptic, mini, reel)
 * @param {object} config - Score configuration
 * @returns {number} Score in seconds
 */
function generateRealisticScore(gameType, config) {
  const ranges = {
    tandem: { min: config.tandem_min_score, max: config.tandem_max_score },
    cryptic: { min: config.cryptic_min_score, max: config.cryptic_max_score },
    mini: { min: config.mini_min_score, max: config.mini_max_score },
    reel: { min: config.reel_min_score, max: config.reel_max_score },
  };

  const range = ranges[gameType];
  if (!range) {
    throw new Error(`Invalid game type: ${gameType}`);
  }

  // Use beta distribution for more realistic scores
  // Most scores cluster in the middle, with some very fast and some slower
  const alpha = 2;
  const beta = 2;

  // Generate beta-distributed random value (0-1)
  const u1 = Math.random();
  const u2 = Math.random();
  const v1 = Math.pow(u1, 1 / alpha);
  const v2 = Math.pow(u2, 1 / beta);
  const betaValue = v1 / (v1 + v2);

  // Scale to score range
  const score = Math.floor(range.min + betaValue * (range.max - range.min));

  return score;
}

/**
 * Generate realistic hints used for a game
 * Each game has different hint limits
 *
 * @param {string} gameType - Game type (tandem, cryptic, mini, reel)
 * @returns {number} Number of hints used
 */
function generateHintsUsed(gameType) {
  // Mini doesn't use hints
  if (gameType === 'mini') {
    return 0;
  }

  // Reel Connections has only 1 hint available
  if (gameType === 'reel') {
    // 60% chance of no hint, 40% chance of using the hint
    return Math.random() < 0.6 ? 0 : 1;
  }

  // Daily Tandem has maximum 2 hints (one per puzzle pair)
  if (gameType === 'tandem') {
    const rand = Math.random();
    // 40% chance of 0 hints
    // 35% chance of 1 hint
    // 25% chance of 2 hints
    if (rand < 0.4) return 0;
    if (rand < 0.75) return 1;
    return 2;
  }

  // Cryptic (if it exists) - assume similar to tandem
  // Default: 0-2 hints
  const rand = Math.random();
  if (rand < 0.4) return 0;
  if (rand < 0.75) return 1;
  return 2;
}

/**
 * Generate a random timestamp for bot submission
 * Now that we generate bots throughout the day via cron, timestamps should be
 * close to the current time (with some variance) for a natural appearance.
 *
 * @param {Date} date - Target date (unused now, kept for API compatibility)
 * @param {boolean} spreadThroughoutDay - If true, add variance; if false, cluster tighter
 * @returns {Date} Submission timestamp
 */
function generateSubmissionTime(_date, spreadThroughoutDay = true) {
  const now = new Date();

  if (spreadThroughoutDay) {
    // Add random variance: -60 to +30 minutes from now
    // Slightly biased to the past so entries appear to have just happened
    const varianceMs = (Math.random() * 90 - 60) * 60 * 1000;
    return new Date(now.getTime() + varianceMs);
  } else {
    // Tighter clustering: -15 to +5 minutes from now
    const varianceMs = (Math.random() * 20 - 15) * 60 * 1000;
    return new Date(now.getTime() + varianceMs);
  }
}

/**
 * Generate bot leaderboard entries for a specific date and game
 *
 * @param {object} options
 * @param {string} options.gameType - Game type (tandem, cryptic, mini, reel)
 * @param {Date} options.date - Target date
 * @param {number} options.count - Number of bot entries to generate
 * @param {object} options.config - Bot configuration
 * @param {Array<{username: string, avatarId: string, currentStreak: number}>} options.carryoverBots - Bots to reuse from previous day (with preserved avatars and streaks)
 * @returns {Promise<number>} Number of entries created
 */
export async function generateBotEntries({ gameType, date, count, config, carryoverBots = [] }) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const dateStr = date.toISOString().split('T')[0];
  const entries = [];

  // Fetch available avatars
  const { data: avatars, error: avatarError } = await supabase
    .from('avatars')
    .select('id')
    .limit(100);

  if (avatarError || !avatars || avatars.length === 0) {
    logger.error('[Bot Leaderboard] Error fetching avatars:', avatarError);
    throw new Error('Could not fetch avatars for bot entries');
  }

  // Generate bot entries: use carryover usernames first, then generate new ones
  const botEntryData = [];
  const carryoverUsernameSet = new Set(carryoverBots.map((b) => b.username));

  // Add carryover bots first (up to count)
  // Use deterministic avatar based on username to ensure consistency across games
  // Preserve their current streak so we can increment it
  const carryoverCount = Math.min(carryoverBots.length, count);
  for (let i = 0; i < carryoverCount; i++) {
    const { username, currentStreak = 0 } = carryoverBots[i];
    botEntryData.push({
      username,
      avatarId: getAvatarForUsername(username, avatars), // Deterministic avatar
      currentStreak, // Track their existing streak to increment
      isCarryover: true,
    });
  }

  // Generate additional unique bots if needed
  const newBotsToGenerate = count - carryoverCount;
  if (newBotsToGenerate > 0) {
    const newUsernames = new Set();

    while (newUsernames.size < newBotsToGenerate) {
      const username = generateRealisticUsername();
      // Make sure we don't duplicate carryover usernames
      if (!carryoverUsernameSet.has(username) && !newUsernames.has(username)) {
        newUsernames.add(username);
      }
    }

    // Assign deterministic avatars to new bots (same username = same avatar)
    // New bots start with streak = 0 (will become 1 when inserted)
    for (const username of newUsernames) {
      const avatarId = getAvatarForUsername(username, avatars);
      botEntryData.push({ username, avatarId, currentStreak: 0, isCarryover: false });
    }
  }

  logger.info(
    `[Bot Leaderboard] Using ${carryoverCount} carryover bots and ${newBotsToGenerate} new bots for ${gameType}`
  );

  for (let i = 0; i < count; i++) {
    const score = generateRealisticScore(gameType, config);
    const { username, avatarId, currentStreak, isCarryover } = botEntryData[i];
    const submittedAt = generateSubmissionTime(date, config.spread_throughout_day);
    const hintsUsed = generateHintsUsed(gameType);
    // Carryover bots increment their streak, new bots start at 1
    const newStreak = currentStreak + 1;

    entries.push({
      gameType,
      dateStr,
      score,
      username,
      avatarId,
      submittedAt,
      hintsUsed,
      newStreak,
      isCarryover,
    });
  }

  // Sort by submission time
  entries.sort((a, b) => a.submittedAt - b.submittedAt);

  let successCount = 0;

  for (const entry of entries) {
    try {
      logger.info('[Bot Leaderboard] Attempting to insert:', {
        gameType: entry.gameType,
        date: entry.dateStr,
        username: entry.username,
        score: entry.score,
      });

      // Insert daily leaderboard entry
      const { data, error } = await supabase.rpc('insert_bot_leaderboard_score', {
        p_game_type: entry.gameType,
        p_puzzle_date: entry.dateStr,
        p_score: entry.score,
        p_bot_username: entry.username,
        p_bot_avatar_id: entry.avatarId,
        p_metadata: {
          generated_at: new Date().toISOString(),
          submitted_at: entry.submittedAt.toISOString(),
          hintsUsed: entry.hintsUsed,
        },
      });

      if (error) {
        logger.error('[Bot Leaderboard] Error inserting bot entry:', {
          error,
          entry: {
            gameType: entry.gameType,
            date: entry.dateStr,
            username: entry.username,
          },
        });
      } else {
        logger.info('[Bot Leaderboard] Successfully inserted daily entry:', data);

        // Upsert streak entry - carryover bots get their streak incremented,
        // new bots start at 1. The upsert function will update existing entries.
        const { data: streakData, error: streakError } = await supabase.rpc(
          'upsert_bot_streak_entry',
          {
            p_game_type: entry.gameType,
            p_streak_days: entry.newStreak,
            p_bot_username: entry.username,
            p_bot_avatar_id: entry.avatarId,
            p_metadata: {
              generated_at: new Date().toISOString(),
              last_played: entry.dateStr,
              is_carryover: entry.isCarryover,
            },
          }
        );

        if (streakError) {
          logger.error('[Bot Leaderboard] Error upserting bot streak entry:', {
            streakError,
            entry: {
              gameType: entry.gameType,
              username: entry.username,
              newStreak: entry.newStreak,
            },
          });
        } else {
          logger.info('[Bot Leaderboard] Successfully upserted streak entry:', {
            ...streakData,
            streak: entry.newStreak,
            isCarryover: entry.isCarryover,
          });
        }

        successCount++;
      }
    } catch (err) {
      logger.error('[Bot Leaderboard] Exception inserting bot entry:', err);
    }
  }

  logger.info(
    `[Bot Leaderboard] Generated ${successCount}/${count} bot entries for ${gameType} on ${dateStr}`
  );

  return successCount;
}

/**
 * Generate bot entries for all games for today
 *
 * @returns {Promise<object>} Summary of generated entries
 */
export async function generateDailyBotEntries() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch configuration
    const { data: configs, error: configError } = await supabase
      .from('bot_leaderboard_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !configs) {
      logger.error('[Bot Leaderboard] Error fetching config:', configError);
      return { success: false, error: 'Configuration not found' };
    }

    // Check if bot generation is enabled
    if (!configs.enabled) {
      logger.info('[Bot Leaderboard] Bot generation is disabled');
      return { success: true, message: 'Bot generation is disabled', generated: 0 };
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Get yesterday's date for carryover
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const games = ['tandem', 'mini', 'reel'];
    const results = {};

    for (const game of games) {
      // Fetch carryover bots from yesterday FOR THIS SPECIFIC GAME
      // Use DISTINCT to avoid duplicates, and include avatar for consistency
      let carryoverBots = [];
      if (configs.carryover_bot_count > 0) {
        const { data: yesterdayBots, error: carryoverError } = await supabase
          .from('leaderboard_entries')
          .select('bot_username, bot_avatar_id')
          .eq('puzzle_date', yesterdayStr)
          .eq('game_type', game) // Filter by specific game
          .eq('leaderboard_type', 'daily_speed') // Only from daily leaderboard
          .eq('is_bot', true)
          .not('bot_username', 'is', null)
          .limit(configs.carryover_bot_count);

        if (!carryoverError && yesterdayBots && yesterdayBots.length > 0) {
          // Deduplicate by username (in case there are somehow duplicates)
          const seenUsernames = new Set();
          const uniqueYesterdayBots = yesterdayBots.filter((entry) => {
            if (seenUsernames.has(entry.bot_username)) {
              return false;
            }
            seenUsernames.add(entry.bot_username);
            return true;
          });

          // Now fetch the current streak for each carryover bot
          const usernames = uniqueYesterdayBots.map((b) => b.bot_username);
          const { data: streakEntries, error: streakError } = await supabase
            .from('leaderboard_entries')
            .select('bot_username, score')
            .eq('game_type', game)
            .eq('leaderboard_type', 'best_streak')
            .eq('is_bot', true)
            .in('bot_username', usernames);

          // Create a map of username -> current streak
          const streakMap = new Map();
          if (!streakError && streakEntries) {
            for (const entry of streakEntries) {
              // If multiple entries exist for same bot, take the highest streak
              const existing = streakMap.get(entry.bot_username) || 0;
              streakMap.set(entry.bot_username, Math.max(existing, entry.score));
            }
          }

          carryoverBots = uniqueYesterdayBots.map((entry) => ({
            username: entry.bot_username,
            avatarId: entry.bot_avatar_id,
            currentStreak: streakMap.get(entry.bot_username) || 0,
          }));

          logger.info(
            `[Bot Leaderboard] Carrying over ${carryoverBots.length} bots for ${game} from ${yesterdayStr}`,
            { streaks: carryoverBots.map((b) => ({ name: b.username, streak: b.currentStreak })) }
          );
        }
      }
      // Get per-game target count
      const targetCount = configs[`${game}_entries_per_day`] || 20;

      // Calculate how many entries should exist by this point in the day
      // This spreads generation throughout the day instead of all at once
      const now = new Date();

      // Use date + game as seed for daily randomization
      // This creates a consistent but different offset each day per game
      const seedString = `${dateStr}-${game}`;
      const dailySeed = simpleHash(seedString);

      // Random daily offset: shifts the "day start" by 0-3 hours
      // This makes generation windows different each day
      const dailyOffsetHours = (dailySeed % 180) / 60; // 0 to 3 hours

      // Also randomize the "pace" - some days bots join faster, some slower
      // Pace factor between 0.7 and 1.3
      const paceFactor = 0.7 + (dailySeed % 60) / 100;

      const hourOfDay = now.getUTCHours() + now.getUTCMinutes() / 60;
      // Apply the daily offset (wrap around at 24)
      const adjustedHour = (hourOfDay + 24 - dailyOffsetHours) % 24;
      const dayProgress = Math.min(1, (adjustedHour / 24) * paceFactor); // Cap at 1

      // Carryover bots should be generated ASAP (in first run of the day)
      // to maintain their streaks. New bots are spread throughout the day.
      const carryoverCount = carryoverBots.length;
      const newBotsTarget = targetCount - carryoverCount;

      // Target for this point in time (with additional per-run randomness)
      // Add a small random factor (±10%) to make each run slightly unpredictable
      const runRandomFactor = 0.9 + Math.random() * 0.2;
      const newBotsExpectedByNow = Math.floor(newBotsTarget * dayProgress * runRandomFactor);

      // Total expected: all carryover bots (always) + portion of new bots based on time
      const expectedByNow = carryoverCount + newBotsExpectedByNow;

      // Check if we already have bot entries for today
      const { data: existing, error: checkError } = await supabase
        .from('leaderboard_entries')
        .select('id', { count: 'exact' })
        .eq('game_type', game)
        .eq('puzzle_date', dateStr)
        .eq('is_bot', true);

      if (checkError) {
        logger.error(`[Bot Leaderboard] Error checking existing entries for ${game}:`, checkError);
        continue;
      }

      const existingCount = existing?.length || 0;

      logger.info(
        `[Bot Leaderboard] ${game} - existing: ${existingCount}, expected by now: ${expectedByNow} (${carryoverCount} carryover + ${newBotsExpectedByNow} new), daily target: ${targetCount}, day progress: ${(dayProgress * 100).toFixed(1)}% (offset: ${dailyOffsetHours.toFixed(1)}h, pace: ${paceFactor.toFixed(2)}x)`
      );

      if (existingCount >= expectedByNow) {
        logger.info(
          `[Bot Leaderboard] Already have ${existingCount} bot entries for ${game}, expected ${expectedByNow} by now`
        );
        results[game] = { generated: 0, existing: existingCount, expectedByNow };
        continue;
      }

      // Generate entries to reach expected count for this time of day
      const toGenerate = expectedByNow - existingCount;
      logger.info(`[Bot Leaderboard] Generating ${toGenerate} entries for ${game}`);

      const generated = await generateBotEntries({
        gameType: game,
        date: today,
        count: toGenerate,
        config: configs,
        carryoverBots, // Pass carryover bots with preserved avatars
      });

      logger.info(`[Bot Leaderboard] Generated ${generated}/${toGenerate} entries for ${game}`);
      results[game] = { generated, existing: existingCount, total: existingCount + generated };
    }

    return { success: true, date: dateStr, results };
  } catch (error) {
    logger.error('[Bot Leaderboard] Error generating daily bot entries:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all bot entries for a specific date and game
 *
 * @param {string} gameType - Game type
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} Result
 */
export async function deleteBotEntries(gameType, date) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('leaderboard_entries')
      .delete()
      .eq('game_type', gameType)
      .eq('puzzle_date', date)
      .eq('is_bot', true)
      .select('id');

    if (error) {
      logger.error('[Bot Leaderboard] Error deleting bot entries:', error);
      return { success: false, error: error.message };
    }

    const count = data?.length || 0;
    logger.info(`[Bot Leaderboard] Deleted ${count} bot entries for ${gameType} on ${date}`);

    return { success: true, deleted: count };
  } catch (error) {
    logger.error('[Bot Leaderboard] Exception deleting bot entries:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get bot leaderboard configuration
 *
 * @returns {Promise<object>} Configuration
 */
export async function getBotConfig() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('bot_leaderboard_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      logger.error('[Bot Leaderboard] Error fetching config:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('[Bot Leaderboard] Exception fetching config:', error);
    return null;
  }
}

/**
 * Update bot leaderboard configuration
 *
 * @param {object} updates - Configuration updates
 * @returns {Promise<object>} Updated configuration
 */
export async function updateBotConfig(updates) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get existing config ID
    const { data: existing } = await supabase
      .from('bot_leaderboard_config')
      .select('id')
      .limit(1)
      .single();

    if (!existing) {
      return { success: false, error: 'Configuration not found' };
    }

    const { data, error } = await supabase
      .from('bot_leaderboard_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      logger.error('[Bot Leaderboard] Error updating config:', error);
      return { success: false, error: error.message };
    }

    logger.info('[Bot Leaderboard] Configuration updated');
    return { success: true, config: data };
  } catch (error) {
    logger.error('[Bot Leaderboard] Exception updating config:', error);
    return { success: false, error: error.message };
  }
}
