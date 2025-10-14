import cron from 'node-cron';

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

// Track if scheduler is running
let schedulerRunning = false;
let maintenanceTask = null;

// Daily maintenance tasks
async function runDailyMaintenance() {
  try {
    console.log('[Scheduler] Running daily maintenance at', new Date().toISOString());

    // Clear old caches
    if (global.puzzleCache) {
      console.log('[Scheduler] Clearing puzzle cache');
      global.puzzleCache = {};
    }

    // Log stats for monitoring
    const { getStats } = await import('./db');
    const stats = await getStats();
    console.log('[Scheduler] Current stats:', stats);

    console.log('[Scheduler] Daily maintenance complete');
    return true;
  } catch (error) {
    console.error('[Scheduler] Error during daily maintenance:', error);
    return false;
  }
}

// Initialize the scheduler for maintenance tasks only
export function initPuzzleScheduler() {
  if (schedulerRunning) {
    console.log('[Scheduler] Already running, skipping initialization');
    return maintenanceTask;
  }

  // Run maintenance at 3 AM ET daily (low-traffic period)
  const cronPattern = '0 3 * * *';

  maintenanceTask = cron.schedule(cronPattern, async () => {
    console.log('[Scheduler] Maintenance cron job triggered at', new Date().toISOString());
    await runDailyMaintenance();
  }, {
    scheduled: true,
    timezone: "America/New_York"
  });

  schedulerRunning = true;
  global.schedulerRunning = true;

  console.log('[Scheduler] Maintenance scheduler initialized');
  console.log('[Scheduler] Puzzles change at user\'s LOCAL midnight (client-side)');
  console.log('[Scheduler] Daily maintenance runs at 3:00 AM ET');

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
  console.log('[Scheduler] Maintenance scheduler stopped');
}

// Manual cache clear function (for admin use)
export async function manualClearCache() {
  try {
    console.log('[Scheduler] Manual cache clear requested');

    // Clear any caches
    if (global.puzzleCache) {
      global.puzzleCache = {};
      console.log('[Scheduler] Puzzle cache cleared');
    }

    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('[Scheduler] Manual cache clear error:', error);
    return { success: false, error: error.message };
  }
}