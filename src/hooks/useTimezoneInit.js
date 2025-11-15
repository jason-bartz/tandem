/**
 * Timezone Initialization Hook
 *
 * Handles timezone setup, migration, and monitoring for the application.
 * Ensures consistent timezone behavior across iOS and web platforms.
 *
 * @module useTimezoneInit
 */

import { useEffect, useState, useCallback } from 'react';
import localDateService from '@/services/localDateService';
import { performTimezoneMigration, detectTimezoneChange } from '@/utils/timezoneMigration';
import logger from '@/lib/logger';

/**
 * Custom hook for timezone initialization and monitoring
 * @returns {object} Timezone state and utilities
 */
export function useTimezoneInit() {
  const [timezoneState, setTimezoneState] = useState({
    initialized: false,
    loading: true,
    timezone: null,
    migrated: false,
    error: null,
    debugInfo: null,
  });

  useEffect(() => {
    let mounted = true;
    let visibilityHandler = null;
    let focusHandler = null;

    const initializeTimezone = async () => {
      try {
        if (!mounted) return;

        setTimezoneState((prev) => ({ ...prev, loading: true }));

        // Get current timezone info
        const debugInfo = localDateService.getDebugInfo();
        const timezone = debugInfo.systemTimezone;

        logger.log('Timezone initialization started', {
          timezone,
          platform: debugInfo.platform,
          currentDate: debugInfo.currentDateString,
        });

        // Perform migration if needed
        const migrationResult = await performTimezoneMigration();

        // Check for timezone changes
        const timezoneChangeResult = await detectTimezoneChange();

        if (!mounted) return;

        setTimezoneState({
          initialized: true,
          loading: false,
          timezone,
          migrated: migrationResult.completed || !migrationResult.needed,
          migrationInfo: migrationResult,
          timezoneChange: timezoneChangeResult,
          error: null,
          debugInfo,
        });

        logger.log('Timezone initialization completed', {
          timezone,
          migrated: migrationResult.completed || !migrationResult.needed,
          changed: timezoneChangeResult.changed,
        });

        // Send telemetry for monitoring
        sendTimezonetelemetry({
          event: 'timezone_initialized',
          timezone,
          platform: debugInfo.platform,
          migrated: migrationResult.completed,
          changed: timezoneChangeResult.changed,
        });
      } catch (error) {
        logger.error('Timezone initialization failed', error);

        if (!mounted) return;

        setTimezoneState((prev) => ({
          ...prev,
          initialized: false,
          loading: false,
          error: error.message,
        }));

        // Send error telemetry
        sendTimezonetelemetry({
          event: 'timezone_init_error',
          error: error.message,
        });
      }
    };

    const handleAppResume = () => {
      detectTimezoneChange().then((result) => {
        if (result.changed) {
          logger.log('Timezone change detected on app resume', result);

          localDateService.clearCache();
          initializeTimezone();

          // Send telemetry
          sendTimezonetelemetry({
            event: 'timezone_changed',
            from: result.previousTimezone,
            to: result.currentTimezone,
          });
        }
      });
    };

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          handleAppResume();
        }
      };

      focusHandler = () => {
        handleAppResume();
      };

      document.addEventListener('visibilitychange', visibilityHandler);
      window.addEventListener('focus', focusHandler);
    }

    initializeTimezone();

    // Cleanup
    return () => {
      mounted = false;

      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }

      if (focusHandler) {
        window.removeEventListener('focus', focusHandler);
      }
    };
  }, []);

  // Utility function to refresh timezone data
  const refreshTimezone = useCallback(async () => {
    try {
      localDateService.clearCache();
      const debugInfo = localDateService.getDebugInfo();

      setTimezoneState((prev) => ({
        ...prev,
        timezone: debugInfo.systemTimezone,
        debugInfo,
      }));

      logger.log('Timezone refreshed', debugInfo);

      return { success: true, debugInfo };
    } catch (error) {
      logger.error('Timezone refresh failed', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Utility function to get current date in local timezone
  const getCurrentLocalDate = useCallback(() => {
    try {
      return localDateService.getCurrentDateString();
    } catch (error) {
      logger.error('Failed to get current local date', error);
      return null;
    }
  }, []);

  // Utility function to validate date consistency
  const validateDateConsistency = useCallback(() => {
    try {
      const localDate = localDateService.getCurrentDateString();
      const jsDate = new Date();
      const jsDateString = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;

      const consistent = localDate === jsDateString;

      if (!consistent) {
        logger.warn('Date inconsistency detected', {
          localDateService: localDate,
          jsDate: jsDateString,
        });
      }

      return {
        consistent,
        localDate,
        jsDate: jsDateString,
      };
    } catch (error) {
      logger.error('Date validation failed', error);
      return {
        consistent: false,
        error: error.message,
      };
    }
  }, []);

  return {
    ...timezoneState,
    refreshTimezone,
    getCurrentLocalDate,
    validateDateConsistency,
    isReady: timezoneState.initialized && !timezoneState.loading,
  };
}

/**
 * Send timezone telemetry for monitoring
 * @param {object} data - Telemetry data
 */
function sendTimezonetelemetry(data) {
  try {
    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', data.event, {
        event_category: 'timezone',
        ...data,
      });
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    // Silent fail for telemetry
    console.error('[Timezone Telemetry Error]', error);
  }
}

/**
 * HOC to ensure timezone is initialized before rendering
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component
 */
export function withTimezoneInit(Component) {
  return function TimezoneInitWrapper(props) {
    const timezone = useTimezoneInit();

    if (!timezone.isReady) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
          </div>
        </div>
      );
    }

    if (timezone.error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-red-600">
            <p>Initialization Error</p>
            <p className="text-sm mt-2">{timezone.error}</p>
          </div>
        </div>
      );
    }

    return <Component {...props} timezone={timezone} />;
  };
}
