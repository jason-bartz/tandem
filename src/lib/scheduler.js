import cron from 'node-cron';
import { toZonedTime } from 'date-fns-tz';
import { getPuzzleForDate, setPuzzleForDate } from './db';

// Track if scheduler is running
let schedulerRunning = false;

// Function to get the next puzzle date
function getNextPuzzleDate() {
  // Get current time in Eastern Time
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etNow = toZonedTime(now, etTimeZone);
  
  // Get tomorrow's date in ET
  const tomorrow = new Date(etNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return tomorrow.toISOString().split('T')[0];
}

// Function to get current puzzle date based on ET
export function getCurrentPuzzleDateET() {
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etNow = toZonedTime(now, etTimeZone);
  
  // If it's past midnight ET, use today's date
  // Otherwise use yesterday's date (puzzle hasn't rotated yet)
  return etNow.toISOString().split('T')[0];
}

// Function to rotate to the next puzzle
async function rotatePuzzle() {
  try {
    console.log('[Scheduler] Starting puzzle rotation at', new Date().toISOString());
    
    const nextDate = getCurrentPuzzleDateET();
    const puzzle = await getPuzzleForDate(nextDate);
    
    if (puzzle) {
      console.log(`[Scheduler] Successfully rotated to puzzle for ${nextDate}`);
      
      // Log stats for monitoring
      const { getStats } = await import('./db');
      const stats = await getStats();
      console.log('[Scheduler] Current stats:', stats);
      
      // Trigger any necessary cache invalidation
      if (global.puzzleCache) {
        delete global.puzzleCache.current;
      }
      
      return true;
    } else {
      console.error(`[Scheduler] No puzzle found for ${nextDate}`);
      return false;
    }
  } catch (error) {
    console.error('[Scheduler] Error rotating puzzle:', error);
    return false;
  }
}

// Initialize the scheduler
export function initPuzzleScheduler() {
  if (schedulerRunning) {
    console.log('[Scheduler] Already running, skipping initialization');
    return;
  }
  
  // Schedule for 12:01 AM ET every day
  // Cron pattern: minute hour day month day-of-week
  // We need to convert ET to server time
  
  // For production, we'll use a cron pattern that runs at 12:01 AM ET
  // This needs to account for the server's timezone
  const cronPattern = '1 0 * * *'; // This runs at 00:01 server time
  
  // For development/testing, you might want to run more frequently
  // const cronPattern = '*/5 * * * *'; // Every 5 minutes for testing
  
  const task = cron.schedule(cronPattern, async () => {
    console.log('[Scheduler] Cron job triggered at', new Date().toISOString());
    await rotatePuzzle();
  }, {
    scheduled: true,
    timezone: "America/New_York" // Run in ET timezone
  });
  
  schedulerRunning = true;
  global.schedulerRunning = true; // Track globally for status checks
  console.log('[Scheduler] Puzzle rotation scheduler initialized');
  console.log('[Scheduler] Will rotate puzzles daily at 12:01 AM ET');
  
  // Also check if we need to rotate immediately on startup
  checkInitialRotation();
  
  return task;
}

// Check if we need to rotate on startup
async function checkInitialRotation() {
  try {
    const currentDateET = getCurrentPuzzleDateET();
    const lastRotation = global.lastPuzzleRotation || null;
    
    if (!lastRotation || lastRotation !== currentDateET) {
      console.log(`[Scheduler] Initial rotation check: Last rotation was ${lastRotation}, current date is ${currentDateET}`);
      await rotatePuzzle();
      global.lastPuzzleRotation = currentDateET;
    } else {
      console.log(`[Scheduler] No initial rotation needed, already on ${currentDateET}`);
    }
  } catch (error) {
    console.error('[Scheduler] Error during initial rotation check:', error);
  }
}

// Stop the scheduler (useful for cleanup)
export function stopPuzzleScheduler() {
  if (!schedulerRunning) {
    return;
  }
  
  // Note: node-cron tasks need to be stopped individually
  // This is a simplified version
  schedulerRunning = false;
  console.log('[Scheduler] Puzzle rotation scheduler stopped');
}

// Manual rotation function (for admin use)
export async function manualRotatePuzzle(targetDate = null) {
  try {
    const date = targetDate || getCurrentPuzzleDateET();
    console.log(`[Scheduler] Manual rotation to ${date}`);
    
    const puzzle = await getPuzzleForDate(date);
    if (puzzle) {
      global.lastPuzzleRotation = date;
      
      // Clear any caches
      if (global.puzzleCache) {
        delete global.puzzleCache.current;
      }
      
      return { success: true, date, puzzle };
    } else {
      return { success: false, error: `No puzzle found for ${date}` };
    }
  } catch (error) {
    console.error('[Scheduler] Manual rotation error:', error);
    return { success: false, error: error.message };
  }
}