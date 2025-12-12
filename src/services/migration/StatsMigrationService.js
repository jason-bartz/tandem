/**
 * StatsMigrationService - Data migration service for Tandem
 *
 * Safely migrates existing stats data to the new event-sourced architecture.
 * Handles version detection, data transformation, and rollback capabilities.
 */

import { gameEventStore, EventTypes } from '../events/GameEventStore';
import { unifiedStatsManager } from '../stats/UnifiedStatsManager';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';

// Migration versions
const MIGRATION_VERSIONS = {
  LEGACY: 1, // Original localStorage format
  EVENT_SOURCED: 2, // Event-sourced architecture
  UNIFIED: 3, // Unified stats with providers
  CURRENT: 3,
};

// Migration status
const MigrationStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
};

export class StatsMigrationService {
  constructor() {
    this.currentVersion = null;
    this.targetVersion = MIGRATION_VERSIONS.CURRENT;
    this.migrationStatus = MigrationStatus.NOT_STARTED;
    this.backupData = null;
    this.migrationLog = [];
    this.dryRun = false;
  }

  /**
   * Initialize migration service
   */
  async initialize() {
    try {
      // Detect current data version
      this.currentVersion = await this.detectDataVersion();
      this.log(`Current data version: ${this.currentVersion}`);

      if (this.needsMigration()) {
        this.log('Migration needed');
        return true;
      } else {
        this.log('No migration needed');
        return false;
      }
    } catch (error) {
      logger.error('[Migration] Initialization failed', error);
      this.log(`Initialization error: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Detect current data version
   */
  async detectDataVersion() {
    // Check for version marker
    const versionMarker = localStorage.getItem('tandem_data_version');
    if (versionMarker) {
      return parseInt(versionMarker, 10);
    }

    // Check for event store data (version 2+)
    const eventData = localStorage.getItem('gameEvents');
    if (eventData) {
      try {
        const parsed = JSON.parse(eventData);
        return parsed.version || 2;
      } catch {
        // Invalid event data
      }
    }

    // Check for legacy stats format
    const legacyStats = this.detectLegacyData();
    if (legacyStats) {
      return MIGRATION_VERSIONS.LEGACY;
    }

    // No existing data - start with current version
    return MIGRATION_VERSIONS.CURRENT;
  }

  /**
   * Detect legacy data formats
   */
  detectLegacyData() {
    const legacyKeys = [
      'tandemStats',
      'tandem_stats',
      'gameStats',
      'game_stats',
      'puzzleResults',
      'streakData',
    ];

    for (const key of legacyKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed && (parsed.played !== undefined || parsed.wins !== undefined)) {
            this.log(`Found legacy data in key: ${key}`);
            return { key, data: parsed };
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    return null;
  }

  /**
   * Check if migration is needed
   */
  needsMigration() {
    return this.currentVersion < this.targetVersion;
  }

  /**
   * Run migration
   */
  async migrate(options = {}) {
    const { dryRun = false, skipBackup = false } = options;

    this.dryRun = dryRun;
    this.migrationStatus = MigrationStatus.IN_PROGRESS;

    this.log(`Starting migration from v${this.currentVersion} to v${this.targetVersion}`);

    try {
      // Create backup unless skipped
      if (!skipBackup && !dryRun) {
        await this.createBackup();
      }

      // Run migrations in sequence
      const migrations = this.getMigrationPath();

      for (const migration of migrations) {
        await this.runMigration(migration);
      }

      // Verify migration
      const isValid = await this.verifyMigration();
      if (!isValid) {
        throw new Error('Migration verification failed');
      }

      if (!dryRun) {
        localStorage.setItem('tandem_data_version', String(this.targetVersion));
      }

      this.migrationStatus = MigrationStatus.COMPLETED;
      this.log('Migration completed successfully');

      return {
        success: true,
        fromVersion: this.currentVersion,
        toVersion: this.targetVersion,
        log: this.migrationLog,
      };
    } catch (error) {
      logger.error('[Migration] Migration failed', error);
      this.log(`Migration failed: ${error.message}`, 'error');

      this.migrationStatus = MigrationStatus.FAILED;

      // Attempt rollback if not dry run
      if (!dryRun && this.backupData) {
        await this.rollback();
      }

      throw error;
    }
  }

  /**
   * Get migration path
   */
  getMigrationPath() {
    const migrations = [];

    if (this.currentVersion < 2) {
      migrations.push({
        version: 2,
        name: 'migrateToEventSourcing',
        handler: this.migrateToEventSourcing.bind(this),
      });
    }

    if (this.currentVersion < 3) {
      migrations.push({
        version: 3,
        name: 'migrateToUnifiedStats',
        handler: this.migrateToUnifiedStats.bind(this),
      });
    }

    return migrations;
  }

  /**
   * Run a single migration
   */
  async runMigration(migration) {
    this.log(`Running migration: ${migration.name} (v${migration.version})`);

    try {
      await migration.handler();

      this.currentVersion = migration.version;
      this.log(`Migration ${migration.name} completed`);
    } catch (error) {
      this.log(`Migration ${migration.name} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Migrate to event sourcing (v1 -> v2)
   */
  async migrateToEventSourcing() {
    this.log('Migrating to event sourcing...');

    const legacyData = this.detectLegacyData();
    if (!legacyData) {
      this.log('No legacy data found to migrate');
      return;
    }

    const { key, data } = legacyData;
    const events = [];

    // Create synthetic events from legacy stats
    const migrationTimestamp = new Date().toISOString();

    // Migration event
    events.push({
      id: `migration_${uuidv4()}`,
      type: EventTypes.STATS_MIGRATED,
      timestamp: migrationTimestamp,
      deviceId: 'migration',
      sessionId: 'migration',
      version: 1,
      data: {
        fromVersion: 1,
        toVersion: 2,
        stats: {
          gamesPlayed: data.played || 0,
          gamesWon: data.wins || 0,
          currentStreak: data.currentStreak || 0,
          bestStreak: data.maxStreak || data.bestStreak || 0,
          lastPlayedDate: data.lastPlayed || data.lastPlayedDate,
        },
        synthetic: true,
        sourceKey: key,
      },
    });

    // Create synthetic game completed events
    const gamesPlayed = data.played || 0;
    const gamesWon = data.wins || 0;

    // Distribute games over past days
    for (let i = 0; i < gamesPlayed; i++) {
      const daysAgo = gamesPlayed - i;
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() - daysAgo);

      events.push({
        id: `synthetic_game_${uuidv4()}`,
        type: EventTypes.GAME_COMPLETED,
        timestamp: gameDate.toISOString(),
        deviceId: 'migration',
        sessionId: 'migration',
        version: 1,
        data: {
          puzzleDate: gameDate.toISOString().split('T')[0],
          won: i < gamesWon,
          mistakes: 0,
          time: 0,
          synthetic: true,
        },
      });
    }

    // Create streak events if applicable
    if (data.currentStreak > 0) {
      events.push({
        id: `synthetic_streak_${uuidv4()}`,
        type: EventTypes.STREAK_CONTINUED,
        timestamp: migrationTimestamp,
        deviceId: 'migration',
        sessionId: 'migration',
        version: 1,
        data: {
          streak: data.currentStreak,
          date: data.lastPlayedDate || new Date().toISOString().split('T')[0],
          synthetic: true,
        },
      });
    }

    // Save events if not dry run
    if (!this.dryRun) {
      await gameEventStore.initialize();

      // Import events
      await gameEventStore.importEvents({
        version: 2,
        exportDate: migrationTimestamp,
        deviceId: 'migration',
        events,
        stats: gameEventStore.computeStats(events),
      });

      // Archive legacy data
      localStorage.setItem(
        `${key}_archived`,
        JSON.stringify({
          archivedAt: migrationTimestamp,
          originalData: data,
        })
      );

      // Remove original key
      localStorage.removeItem(key);
    }

    this.log(`Migrated ${events.length} events from legacy data`);
  }

  /**
   * Migrate to unified stats (v2 -> v3)
   */
  async migrateToUnifiedStats() {
    this.log('Migrating to unified stats manager...');

    if (!this.dryRun) {
      await unifiedStatsManager.initialize();

      // Trigger initial sync to propagate data
      await unifiedStatsManager.sync();
    }

    this.log('Unified stats migration completed');
  }

  /**
   * Create backup
   */
  async createBackup() {
    this.log('Creating backup...');

    const backup = {
      version: this.currentVersion,
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Backup all relevant localStorage keys
    const keysToBackup = [
      'tandem_data_version',
      'gameEvents',
      'tandemStats',
      'tandem_stats',
      'gameStats',
      'game_stats',
      'puzzleResults',
      'streakData',
    ];

    for (const key of keysToBackup) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        backup.data[key] = value;
      }
    }

    this.backupData = backup;

    // Also save backup to localStorage
    localStorage.setItem('tandem_migration_backup', JSON.stringify(backup));

    this.log(`Backup created with ${Object.keys(backup.data).length} keys`);
  }

  /**
   * Rollback migration
   */
  async rollback() {
    if (!this.backupData) {
      throw new Error('No backup available for rollback');
    }

    this.log('Rolling back migration...');

    try {
      const currentKeys = ['tandem_data_version', 'gameEvents'];

      for (const key of currentKeys) {
        localStorage.removeItem(key);
      }

      // Restore backup data
      for (const [key, value] of Object.entries(this.backupData.data)) {
        localStorage.setItem(key, value);
      }

      this.migrationStatus = MigrationStatus.ROLLED_BACK;
      this.log('Rollback completed successfully');

      return true;
    } catch (error) {
      logger.error('[Migration] Rollback failed', error);
      this.log(`Rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Verify migration
   */
  async verifyMigration() {
    this.log('Verifying migration...');

    try {
      // Check event store
      const events = gameEventStore.events;
      if (!events || events.length === 0) {
        this.log('Warning: No events found after migration', 'warning');
      }

      // Compute and verify stats
      const stats = gameEventStore.computeStats();

      // Basic sanity checks
      if (stats.gamesWon > stats.gamesPlayed) {
        throw new Error('Invalid stats: wins exceed games played');
      }

      if (stats.currentStreak > stats.gamesPlayed) {
        throw new Error('Invalid stats: streak exceeds games played');
      }

      this.log('Migration verification passed');
      return true;
    } catch (error) {
      this.log(`Verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get migration status
   */
  getStatus() {
    return {
      currentVersion: this.currentVersion,
      targetVersion: this.targetVersion,
      status: this.migrationStatus,
      needsMigration: this.needsMigration(),
      log: this.migrationLog,
    };
  }

  /**
   * Clear migration data
   */
  clearMigrationData() {
    localStorage.removeItem('tandem_migration_backup');
    this.backupData = null;
    this.migrationLog = [];
    this.migrationStatus = MigrationStatus.NOT_STARTED;
  }

  /**
   * Export backup
   */
  exportBackup() {
    if (!this.backupData) {
      const stored = localStorage.getItem('tandem_migration_backup');
      if (stored) {
        this.backupData = JSON.parse(stored);
      }
    }

    if (!this.backupData) {
      throw new Error('No backup available to export');
    }

    const blob = new Blob([JSON.stringify(this.backupData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return {
      url,
      filename: `tandem_migration_backup_${timestamp}.json`,
      size: blob.size,
      data: this.backupData,
    };
  }

  /**
   * Import backup
   */
  async importBackup(backupData) {
    try {
      // Validate backup structure
      if (!backupData.version || !backupData.timestamp || !backupData.data) {
        throw new Error('Invalid backup format');
      }

      this.backupData = backupData;
      localStorage.setItem('tandem_migration_backup', JSON.stringify(backupData));

      this.log('Backup imported successfully');
      return true;
    } catch (error) {
      this.log(`Failed to import backup: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Log migration activity
   */
  log(message, level = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    this.migrationLog.push(entry);
  }

  /**
   * Get migration report
   */
  getMigrationReport() {
    return {
      summary: {
        fromVersion: this.currentVersion,
        toVersion: this.targetVersion,
        status: this.migrationStatus,
        timestamp: new Date().toISOString(),
      },
      log: this.migrationLog,
      backup: this.backupData
        ? {
            available: true,
            timestamp: this.backupData.timestamp,
            size: JSON.stringify(this.backupData).length,
          }
        : {
            available: false,
          },
    };
  }
}

// Export singleton instance
export const migrationService = new StatsMigrationService();
export default StatsMigrationService;
