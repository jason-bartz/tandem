import { createServerClient } from '@/lib/supabase/server';
import { notifyMissingPuzzles } from '@/lib/discord';
import logger from '@/lib/logger';

/**
 * Get the current hour in US Eastern time (0-23)
 */
function getEasternHour() {
  return parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }),
    10
  );
}

/**
 * Get tomorrow's date as YYYY-MM-DD in US Eastern time
 */
function getTomorrowDateET() {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const today = new Date(todayStr + 'T00:00:00');
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
}

/**
 * Check which puzzles are missing for tomorrow
 */
async function findMissingPuzzles(supabase, games, date) {
  const missingByGame = {};

  const tableMap = {
    tandem: 'tandem_puzzles',
    mini: 'mini_puzzles',
    reel: 'reel_connections_puzzles',
    soup: 'element_soup_puzzles',
  };

  for (const game of games) {
    const table = tableMap[game];
    if (!table) continue;

    try {
      const { data } = await supabase.from(table).select('id').eq('date', date).limit(1);

      if (!data || data.length === 0) {
        missingByGame[game] = [date];
      }
    } catch (err) {
      logger.error(`[Puzzle Alerts] Error checking ${game} for ${date}:`, err);
    }
  }

  return missingByGame;
}

/**
 * Main function: check for missing puzzles and send Discord alert if needed
 * @param {Object} options
 * @param {boolean} options.skipCooldown - Skip cooldown and time-of-day checks (for test alerts)
 * @returns {Object} result with missing puzzles info and whether alert was sent
 */
export async function checkMissingPuzzles({ skipCooldown = false } = {}) {
  const supabase = createServerClient();

  // Fetch settings
  const { data: settings, error: settingsError } = await supabase
    .from('puzzle_alert_settings')
    .select('*')
    .limit(1)
    .single();

  if (settingsError || !settings) {
    logger.warn('[Puzzle Alerts] No settings found, skipping check');
    return { skipped: true, reason: 'no_settings' };
  }

  if (!settings.enabled) {
    return { skipped: true, reason: 'disabled' };
  }

  if (!settings.webhook_url) {
    return { skipped: true, reason: 'no_webhook_url' };
  }

  if (!skipCooldown) {
    // Check if we're past the alert start hour (Eastern time)
    const currentHourET = getEasternHour();
    const startHour = settings.alert_start_hour ?? 9;
    if (currentHourET < startHour) {
      return { skipped: true, reason: 'before_start_hour' };
    }

    // Check cooldown (avoid spamming)
    if (settings.last_alert_sent_at) {
      const lastSent = new Date(settings.last_alert_sent_at);
      const lastSentDateET = lastSent.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

      if (settings.check_interval_hours === 0) {
        // "Once" mode: only alert once per day
        if (lastSentDateET === todayET) {
          return { skipped: true, reason: 'already_alerted_today' };
        }
      } else {
        const cooldownMs = settings.check_interval_hours * 60 * 60 * 1000;
        if (Date.now() - lastSent.getTime() < cooldownMs) {
          return { skipped: true, reason: 'cooldown' };
        }
      }
    }
  }

  const tomorrow = getTomorrowDateET();
  const missingByGame = await findMissingPuzzles(supabase, settings.games_to_monitor, tomorrow);

  const totalMissing = Object.keys(missingByGame).length;

  if (totalMissing === 0) {
    return { skipped: false, alertSent: false, message: 'All puzzles present', missingByGame: {} };
  }

  // Send the alert
  await notifyMissingPuzzles({
    missingByGame,
    webhookUrl: settings.webhook_url,
  });

  // Update last_alert_sent_at
  await supabase
    .from('puzzle_alert_settings')
    .update({ last_alert_sent_at: new Date().toISOString() })
    .eq('id', settings.id);

  logger.info('[Puzzle Alerts] Alert sent', { totalMissing, missingByGame });

  return { skipped: false, alertSent: true, totalMissing, missingByGame };
}
