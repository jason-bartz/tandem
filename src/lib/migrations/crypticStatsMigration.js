/**
 * Client-Side Migration: Sync Local Cryptic Stats to Database
 *
 * This migration runs automatically when authenticated users open the app.
 * It ensures existing local stats are synced to the database following the
 * database-first architecture.
 *
 * MOBILE GAME BEST PRACTICES:
 * - Database = Source of truth for authenticated users
 * - Local storage = Offline cache
 * - Automatic migration on login
 * - Conflict resolution: merge with max values
 */

import logger from '@/lib/logger';

/**
 * Check if migration has already been completed for this user
 * @private
 */
async function hasMigrationCompleted() {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const migrationKey = 'cryptic_stats_migrated_to_db';
    const migrated = localStorage.getItem(migrationKey);
    return migrated === 'true';
  } catch (error) {
    logger.error('[CrypticMigration] Failed to check migration status', error);
    return false;
  }
}

/**
 * Mark migration as completed
 * @private
 */
async function markMigrationCompleted() {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const migrationKey = 'cryptic_stats_migrated_to_db';
    localStorage.setItem(migrationKey, 'true');
    logger.info('[CrypticMigration] Migration marked as completed');
  } catch (error) {
    logger.error('[CrypticMigration] Failed to mark migration as completed', error);
  }
}

/**
 * Migrate local cryptic stats to database
 * This function is called automatically when an authenticated user loads the app
 *
 * @param {Object} _user - The authenticated user object (unused, reserved for future use)
 * @returns {Promise<Object>} Migration result with success status
 */
export async function migrateCrypticStatsToDatabase(_user) {
  try {
    const alreadyMigrated = await hasMigrationCompleted();
    if (alreadyMigrated) {
      logger.info('[CrypticMigration] Migration already completed for this device');
      return { success: true, alreadyMigrated: true };
    }

    logger.info('[CrypticMigration] Starting local stats migration to database...');

    // Import dynamically to avoid circular dependencies
    const { loadCrypticStats } = await import('@/lib/crypticStorage');

    // Load stats - this will automatically sync with database
    // The loadCrypticStats function handles the merge logic
    const stats = await loadCrypticStats();

    logger.info('[CrypticMigration] Stats loaded and synced:', stats);

    // Mark migration as completed
    await markMigrationCompleted();

    logger.info('[CrypticMigration] ✅ Migration completed successfully');

    return {
      success: true,
      alreadyMigrated: false,
      stats,
    };
  } catch (error) {
    logger.error('[CrypticMigration] Migration failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if user should trigger migration
 * Call this after user authentication
 *
 * @param {Object} _user - The authenticated user object (unused, reserved for future use)
 * @returns {Promise<boolean>} True if migration should run
 */
export async function shouldRunMigration(_user) {
  if (!_user) {
    return false;
  }

  const alreadyMigrated = await hasMigrationCompleted();
  return !alreadyMigrated;
}
