import cron from 'node-cron';
import logger from '@/lib/logger';

/**
 * Maintenance Scheduler
 *
 * Following Wordle best practices:
 * - Puzzles change at user's LOCAL midnight (client-side)
 * - No server-side puzzle rotation
 * - Server only handles maintenance tasks
 *
 * This scheduler runs daily maintenance tasks like:
 * - Stats aggregation
 * - Database cleanup
 * - Cache management
 */

let schedulerRunning = false;
let maintenanceTask = null;

// Daily maintenance tasks
async function runDailyMaintenance() {
  try {
    if (global.puzzleCache) {
      global.puzzleCache = {};
    }

    // Log stats for monitoring
    const { getStats } = await import('./db');
    await getStats();

    return true;
  } catch (error) {
    logger.error('Error during daily maintenance', error);
    return false;
  }
}

export function initPuzzleScheduler() {
  if (schedulerRunning) {
    return maintenanceTask;
  }

  // Run maintenance at 3 AM ET daily (low-traffic period)
  const cronPattern = '0 3 * * *';

  maintenanceTask = cron.schedule(
    cronPattern,
    async () => {
      await runDailyMaintenance();
    },
    {
      scheduled: true,
      timezone: 'America/New_York',
    }
  );

  schedulerRunning = true;
  global.schedulerRunning = true;

  return maintenanceTask;
}

// Stop the scheduler (useful for cleanup)
export function stopPuzzleScheduler() {
  if (!schedulerRunning) {
    return;
  }

  if (maintenanceTask) {
    maintenanceTask.stop();
  }

  schedulerRunning = false;
  global.schedulerRunning = false;
}

// Manual cache clear function (for admin use)
export async function manualClearCache() {
  try {
    if (global.puzzleCache) {
      global.puzzleCache = {};
    }

    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    logger.error('Manual cache clear error', error);
    return { success: false, error: error.message };
  }
}
