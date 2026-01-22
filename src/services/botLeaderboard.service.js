/**
 * Bot Leaderboard Service
 *
 * Generates synthetic leaderboard entries to create the illusion of more active players.
 * Bots have realistic usernames and scores, and submissions are spread throughout the day.
 */

import { generateRandomUsername } from '@/utils/usernameGenerator';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

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
 * Generate a random timestamp within the day
 * If spreadThroughoutDay is true, spread evenly; otherwise cluster near puzzle release
 *
 * @param {Date} date - Target date
 * @param {boolean} spreadThroughoutDay - Whether to spread throughout the day
 * @returns {Date} Random timestamp
 */
function generateSubmissionTime(date, spreadThroughoutDay = true) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (spreadThroughoutDay) {
    // Random time throughout the entire day
    const randomMs = Math.random() * 24 * 60 * 60 * 1000;
    return new Date(dayStart.getTime() + randomMs);
  } else {
    // Cluster submissions in first few hours (realistic for daily puzzle players)
    const hoursRange = 6; // First 6 hours of the day
    const randomMs = Math.random() * hoursRange * 60 * 60 * 1000;
    return new Date(dayStart.getTime() + randomMs);
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
 * @param {Array<{username: string, avatarId: string}>} options.carryoverBots - Bots to reuse from previous day (with preserved avatars)
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

  // Build a map of carryover usernames to their avatars for quick lookup
  const carryoverAvatarMap = new Map();
  for (const bot of carryoverBots) {
    carryoverAvatarMap.set(bot.username, bot.avatarId);
  }

  // Generate bot entries: use carryover first, then generate new ones
  const botEntryData = [];

  // Add carryover bots first (up to count)
  const carryoverCount = Math.min(carryoverBots.length, count);
  for (let i = 0; i < carryoverCount; i++) {
    botEntryData.push({
      username: carryoverBots[i].username,
      avatarId: carryoverBots[i].avatarId, // Preserve their avatar
    });
  }

  // Generate additional unique bots if needed
  const newBotsToGenerate = count - carryoverCount;
  if (newBotsToGenerate > 0) {
    const newUsernames = new Set();
    const carryoverUsernameSet = new Set(carryoverBots.map((b) => b.username));

    while (newUsernames.size < newBotsToGenerate) {
      const username = generateRandomUsername();
      // Make sure we don't duplicate carryover usernames
      if (!carryoverUsernameSet.has(username) && !newUsernames.has(username)) {
        newUsernames.add(username);
      }
    }

    // Assign random avatars to new bots
    for (const username of newUsernames) {
      const avatarId = avatars[Math.floor(Math.random() * avatars.length)].id;
      botEntryData.push({ username, avatarId });
    }
  }

  logger.info(
    `[Bot Leaderboard] Using ${carryoverCount} carryover bots and ${newBotsToGenerate} new bots for ${gameType}`
  );

  for (let i = 0; i < count; i++) {
    const score = generateRealisticScore(gameType, config);
    const { username, avatarId } = botEntryData[i];
    const submittedAt = generateSubmissionTime(date, config.spread_throughout_day);
    const hintsUsed = generateHintsUsed(gameType);

    entries.push({
      gameType,
      dateStr,
      score,
      username,
      avatarId,
      submittedAt,
      hintsUsed,
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

        // Also insert streak entry with streak = 1
        const { data: streakData, error: streakError } = await supabase.rpc(
          'insert_bot_streak_entry',
          {
            p_game_type: entry.gameType,
            p_streak_days: 1,
            p_bot_username: entry.username,
            p_bot_avatar_id: entry.avatarId,
            p_puzzle_date: entry.dateStr,
            p_metadata: {
              generated_at: new Date().toISOString(),
              last_played: entry.dateStr,
            },
          }
        );

        if (streakError) {
          logger.error('[Bot Leaderboard] Error inserting bot streak entry:', {
            streakError,
            entry: {
              gameType: entry.gameType,
              username: entry.username,
            },
          });
        } else {
          logger.info('[Bot Leaderboard] Successfully inserted streak entry:', streakData);
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
          carryoverBots = yesterdayBots
            .filter((entry) => {
              if (seenUsernames.has(entry.bot_username)) {
                return false;
              }
              seenUsernames.add(entry.bot_username);
              return true;
            })
            .map((entry) => ({
              username: entry.bot_username,
              avatarId: entry.bot_avatar_id,
            }));

          logger.info(
            `[Bot Leaderboard] Carrying over ${carryoverBots.length} bots for ${game} from ${yesterdayStr}`
          );
        }
      }
      // Get per-game target count
      const targetCount = configs[`${game}_entries_per_day`] || 20;

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

      logger.info(`[Bot Leaderboard] ${game} - existing: ${existingCount}, target: ${targetCount}`);

      if (existingCount >= targetCount) {
        logger.info(`[Bot Leaderboard] Already have ${existingCount} bot entries for ${game}`);
        results[game] = { generated: 0, existing: existingCount };
        continue;
      }

      // Generate remaining entries
      const toGenerate = targetCount - existingCount;
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
