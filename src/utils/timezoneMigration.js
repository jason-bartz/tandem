/**
 * Timezone Migration Utility
 *
 * Handles the migration from ET-based storage to local timezone storage,
 * ensuring smooth transition without data loss or user disruption.
 *
 * @module timezoneMigration
 */

import localDateService from '@/services/localDateService';
import { getStorageItem, setStorageItem } from '@/lib/storage';

const MIGRATION_KEY = 'timezone_migration_v1_completed';
const MIGRATION_LOG_KEY = 'timezone_migration_log';

/**
 * Check if migration is needed and perform it if necessary
 * @returns {Promise<object>} Migration results
 */
export async function performTimezoneMigration() {
  const migrationResults = {
    needed: false,
    completed: false,
    timestamp: new Date().toISOString(),
    changes: [],
    errors: [],
  };

  try {
    // Check if migration has already been completed
    const migrationCompleted = await getStorageItem(MIGRATION_KEY);
    if (migrationCompleted === 'true') {
      migrationResults.needed = false;
      migrationResults.message = 'Migration already completed';
      return migrationResults;
    }

    // Get current timezone info
    const debugInfo = localDateService.getDebugInfo();
    const userTimezone = debugInfo.systemTimezone;

    migrationResults.needed = true;
    migrationResults.userTimezone = userTimezone;

    // Log migration start
    console.log('[TimezoneMigration] Starting migration to local timezone', {
      userTimezone,
      currentDate: localDateService.getCurrentDateString(),
    });

    // Detect if user is in ET timezone (no migration needed for data)
    const isET =
      userTimezone.includes('America/New_York') ||
      userTimezone.includes('America/Toronto') ||
      userTimezone.includes('Eastern');

    if (isET) {
      migrationResults.changes.push({
        type: 'info',
        message: 'User is in ET timezone - data compatible, marking migration complete',
      });
    } else {
      // For non-ET users, log the timezone difference
      migrationResults.changes.push({
        type: 'timezone_change',
        from: 'America/New_York',
        to: userTimezone,
        message: 'Timezone configuration updated to use local timezone',
      });
    }

    // Update streak calculation logic to handle both old and new dates
    await migrateStreakData(migrationResults);

    // Mark migration as completed
    await setStorageItem(MIGRATION_KEY, 'true');
    await setStorageItem(MIGRATION_LOG_KEY, JSON.stringify(migrationResults));

    migrationResults.completed = true;
    console.log('[TimezoneMigration] Migration completed successfully', migrationResults);
  } catch (error) {
    console.error('[TimezoneMigration] Migration failed:', error);
    migrationResults.errors.push({
      type: 'migration_error',
      message: error.message,
      stack: error.stack,
    });
  }

  return migrationResults;
}

/**
 * Migrate streak data to handle timezone transition
 * @param {object} results - Migration results object to update
 */
async function migrateStreakData(results) {
  try {
    const statsKey = 'tandem_stats';
    const statsData = await getStorageItem(statsKey);

    if (!statsData) {
      results.changes.push({
        type: 'info',
        message: 'No existing stats to migrate',
      });
      return;
    }

    const stats = JSON.parse(statsData);

    // Add migration metadata to stats
    if (!stats.migrationInfo) {
      stats.migrationInfo = {
        migratedAt: new Date().toISOString(),
        fromTimezone: 'America/New_York',
        toTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        version: '1.0',
      };

      await setStorageItem(statsKey, JSON.stringify(stats));

      results.changes.push({
        type: 'stats_updated',
        message: 'Added migration metadata to stats',
        details: stats.migrationInfo,
      });
    }

    // Check and fix any date inconsistencies
    if (stats.lastStreakDate) {
      const isValidDate = localDateService.isValidDateString(stats.lastStreakDate);

      if (!isValidDate) {
        const today = localDateService.getCurrentDateString();
        console.log('[TimezoneMigration] Fixing invalid lastStreakDate:', {
          old: stats.lastStreakDate,
          new: today,
        });

        stats.lastStreakDate = today;
        await setStorageItem(statsKey, JSON.stringify(stats));

        results.changes.push({
          type: 'date_fixed',
          field: 'lastStreakDate',
          oldValue: stats.lastStreakDate,
          newValue: today,
        });
      }
    }
  } catch (error) {
    results.errors.push({
      type: 'streak_migration_error',
      message: error.message,
    });
  }
}

/**
 * Get migration status and log
 * @returns {Promise<object>} Migration status and log
 */
export async function getMigrationStatus() {
  try {
    const completed = (await getStorageItem(MIGRATION_KEY)) === 'true';
    const logData = await getStorageItem(MIGRATION_LOG_KEY);
    const log = logData ? JSON.parse(logData) : null;

    return {
      migrated: completed,
      log,
      currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentDate: localDateService.getCurrentDateString(),
    };
  } catch (error) {
    console.error('[TimezoneMigration] Error getting migration status:', error);
    return {
      migrated: false,
      error: error.message,
    };
  }
}

/**
 * Reset migration (for testing purposes)
 * @param {boolean} clearData - Whether to clear migration data
 */
export async function resetMigration(clearData = false) {
  try {
    await setStorageItem(MIGRATION_KEY, 'false');

    if (clearData) {
      await setStorageItem(MIGRATION_LOG_KEY, '');
    }

    console.log('[TimezoneMigration] Migration reset');
    return { success: true };
  } catch (error) {
    console.error('[TimezoneMigration] Error resetting migration:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check for timezone change since last app use
 * @returns {Promise<object>} Timezone change detection result
 */
export async function detectTimezoneChange() {
  try {
    const lastTimezoneKey = 'last_known_timezone';
    const lastTimezone = await getStorageItem(lastTimezoneKey);
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!lastTimezone) {
      // First time, save current timezone
      await setStorageItem(lastTimezoneKey, currentTimezone);
      return {
        changed: false,
        firstRun: true,
        currentTimezone,
      };
    }

    const changed = lastTimezone !== currentTimezone;

    if (changed) {
      console.log('[TimezoneMigration] Timezone change detected:', {
        from: lastTimezone,
        to: currentTimezone,
      });

      // Update stored timezone
      await setStorageItem(lastTimezoneKey, currentTimezone);

      // Clear date cache to ensure fresh calculations
      localDateService.clearCache();
    }

    return {
      changed,
      previousTimezone: lastTimezone,
      currentTimezone,
    };
  } catch (error) {
    console.error('[TimezoneMigration] Error detecting timezone change:', error);
    return {
      error: error.message,
    };
  }
}

// Auto-run migration on module load in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Run migration after a short delay to ensure app is initialized
  setTimeout(() => {
    performTimezoneMigration().catch((error) => {
      console.error('[TimezoneMigration] Auto-migration failed:', error);
    });
  }, 1000);
}

// Expose for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.timezoneMigration = {
    performMigration: performTimezoneMigration,
    getStatus: getMigrationStatus,
    reset: resetMigration,
    detectChange: detectTimezoneChange,
  };
  console.log('🔄 Timezone migration tools available: window.timezoneMigration');
}
