/**
 * MigrationUI - React component for data migration
 *
 * Provides user interface for migrating existing data to new architecture.
 * Shows progress, handles errors, and allows rollback if needed.
 */

import React, { useState, useEffect } from 'react';
import { migrationService } from '../services/migration/StatsMigrationService';
import { unifiedStatsManager } from '../services/stats/UnifiedStatsManager';
import logger from '@/lib/logger';

const MigrationStatus = {
  CHECKING: 'checking',
  NOT_NEEDED: 'not_needed',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export function MigrationUI({ onComplete, onSkip }) {
  const [status, setStatus] = useState(MigrationStatus.CHECKING);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [migrationLog, setMigrationLog] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [backupAvailable, setBackupAvailable] = useState(false);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const needsMigration = await migrationService.initialize();

      if (needsMigration) {
        setStatus(MigrationStatus.READY);
        const status = migrationService.getStatus();
        setMigrationLog(status.log);
      } else {
        setStatus(MigrationStatus.NOT_NEEDED);

        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      logger.error('Migration check failed', error);
      setError(error.message);
      setStatus(MigrationStatus.FAILED);
    }
  };

  const startMigration = async () => {
    setStatus(MigrationStatus.IN_PROGRESS);
    setProgress(0);
    setError(null);

    try {
      // Subscribe to migration progress (if available)
      const progressInterval = setInterval(() => {
        const status = migrationService.getStatus();
        setMigrationLog(status.log);

        // Estimate progress based on log entries
        const totalSteps = 5; // Approximate number of steps
        const currentProgress = Math.min((status.log.length / totalSteps) * 100, 90);
        setProgress(currentProgress);

        // Get current step from last log entry
        if (status.log.length > 0) {
          const lastEntry = status.log[status.log.length - 1];
          setCurrentStep(lastEntry.message);
        }
      }, 100);

      // Run migration
      const result = await migrationService.migrate({
        dryRun: false,
        skipBackup: false,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setStatus(MigrationStatus.COMPLETED);
        setBackupAvailable(true);

        await unifiedStatsManager.initialize();

        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        throw new Error('Migration failed');
      }
    } catch (error) {
      logger.error('Migration failed', error);
      setError(error.message);
      setStatus(MigrationStatus.FAILED);
      setBackupAvailable(true);
    }
  };

  const rollbackMigration = async () => {
    try {
      setCurrentStep('Rolling back changes...');
      await migrationService.rollback();
      setError(null);
      setStatus(MigrationStatus.READY);
      setCurrentStep('Rollback completed');
    } catch (error) {
      logger.error('Rollback failed', error);
      setError(`Rollback failed: ${error.message}`);
    }
  };

  const exportBackup = () => {
    try {
      const backup = migrationService.exportBackup();

      // Create download link
      const a = document.createElement('a');
      a.href = backup.url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(backup.url);
    } catch (error) {
      logger.error('Export failed', error);
      setError(`Export failed: ${error.message}`);
    }
  };

  const skipMigration = () => {
    if (
      window.confirm(
        'Are you sure you want to skip migration? You can migrate later from settings.'
      )
    ) {
      onSkip();
    }
  };

  const renderContent = () => {
    switch (status) {
      case MigrationStatus.CHECKING:
        return (
          <div className="migration-checking">
            <div className="spinner" />
            <h3>Checking for updates...</h3>
            <p>Please wait while we check your game data.</p>
          </div>
        );

      case MigrationStatus.NOT_NEEDED:
        return (
          <div className="migration-not-needed">
            <div className="success-icon">✓</div>
            <h3>You're all set!</h3>
            <p>Your game data is already up to date.</p>
          </div>
        );

      case MigrationStatus.READY:
        return (
          <div className="migration-ready">
            <div className="update-icon">🔄</div>
            <h3>Data Update Available</h3>
            <p>
              We've improved how Tandem stores and syncs your game data. This one-time update will
              enhance performance and reliability.
            </p>

            <div className="migration-benefits">
              <h4>What's new:</h4>
              <ul>
                <li>✨ Better sync across all your devices</li>
                <li>🚀 Faster performance</li>
                <li>🛡️ More reliable data storage</li>
                <li>📊 Enhanced statistics tracking</li>
              </ul>
            </div>

            <div className="migration-info">
              <p className="info-text">
                <strong>Your data is safe:</strong> We'll create a backup before making any changes.
              </p>
            </div>

            <div className="migration-actions">
              <button className="btn-primary" onClick={startMigration}>
                Update Now
              </button>
              <button className="btn-secondary" onClick={skipMigration}>
                Skip for Now
              </button>
            </div>

            {showDetails && (
              <div className="migration-details">
                <h4>Technical Details:</h4>
                <pre>{JSON.stringify(migrationService.getStatus(), null, 2)}</pre>
              </div>
            )}

            <button className="btn-link" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>
          </div>
        );

      case MigrationStatus.IN_PROGRESS:
        return (
          <div className="migration-progress">
            <div className="spinner" />
            <h3>Updating your data...</h3>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <p className="progress-text">{Math.round(progress)}% complete</p>

            {currentStep && <p className="current-step">{currentStep}</p>}

            <div className="migration-log">
              {migrationLog.slice(-5).map((entry, index) => (
                <div key={index} className={`log-entry log-${entry.level}`}>
                  {entry.message}
                </div>
              ))}
            </div>
          </div>
        );

      case MigrationStatus.COMPLETED:
        return (
          <div className="migration-completed">
            <div className="success-icon">✓</div>
            <h3>Update Complete!</h3>
            <p>Your game data has been successfully updated.</p>

            {backupAvailable && (
              <button className="btn-secondary" onClick={exportBackup}>
                Download Backup
              </button>
            )}
          </div>
        );

      case MigrationStatus.FAILED:
        return (
          <div className="migration-failed">
            <div className="error-icon">⚠️</div>
            <h3>Update Failed</h3>
            <p>We encountered an issue updating your data.</p>

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="migration-actions">
              {backupAvailable && (
                <button className="btn-primary" onClick={rollbackMigration}>
                  Restore Previous Data
                </button>
              )}

              <button className="btn-secondary" onClick={startMigration}>
                Try Again
              </button>

              <button className="btn-secondary" onClick={skipMigration}>
                Skip for Now
              </button>
            </div>

            {backupAvailable && (
              <button className="btn-link" onClick={exportBackup}>
                Download backup file
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="migration-ui">
      <div className="migration-container">{renderContent()}</div>
    </div>
  );
}

export function MigrationBanner({ onDismiss }) {
  const [needsMigration, setNeedsMigration] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkMigration();
  }, []);

  const checkMigration = async () => {
    try {
      const needs = await migrationService.initialize();
      setNeedsMigration(needs);
    } catch (error) {
      logger.error('Migration check failed', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!needsMigration || dismissed) {
    return null;
  }

  return (
    <div className="migration-banner">
      <div className="banner-content">
        <span className="banner-icon">🔄</span>
        <span className="banner-text">Data update available for improved performance</span>
        <button
          className="banner-action"
          onClick={() => (window.location.href = '/settings/migration')}
        >
          Update Now
        </button>
        <button className="banner-dismiss" onClick={handleDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}

// Migration hook for use in other components
export function useMigration() {
  const [status, setStatus] = useState(null);
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const needs = await migrationService.initialize();
      setNeedsMigration(needs);
      setStatus(migrationService.getStatus());
    } catch (error) {
      logger.error('Migration status check failed', error);
    }
  };

  const startMigration = async (options = {}) => {
    try {
      const result = await migrationService.migrate(options);
      setStatus(migrationService.getStatus());
      return result;
    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  };

  const rollback = async () => {
    try {
      await migrationService.rollback();
      setStatus(migrationService.getStatus());
    } catch (error) {
      logger.error('Rollback failed', error);
      throw error;
    }
  };

  return {
    status,
    needsMigration,
    startMigration,
    rollback,
    checkStatus,
  };
}

export default MigrationUI;
