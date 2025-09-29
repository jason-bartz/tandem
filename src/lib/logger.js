/**
 * Centralized logging service for both web and iOS platforms
 * Provides environment-aware logging with different levels
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    this.level = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isIOS = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  }

  getLogLevel() {
    if (typeof process !== 'undefined' && process.env) {
      const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;
      if (envLevel && LogLevel[envLevel.toUpperCase()] !== undefined) {
        return LogLevel[envLevel.toUpperCase()];
      }
    }

    // Default to WARN in production, DEBUG in development
    return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LogLevel).find(key => LogLevel[key] === level);
    return {
      timestamp,
      level: levelName,
      message,
      data: args.length > 0 ? args : undefined,
      platform: this.isIOS ? 'iOS' : 'Web'
    };
  }

  shouldLog(level) {
    return level >= this.level;
  }

  debug(message, ...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, ...args);
      if (this.isDevelopment) {
        console.debug(`[${formatted.timestamp}] [DEBUG]`, message, ...args);
      }
    }
  }

  info(message, ...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage(LogLevel.INFO, message, ...args);
      if (this.isDevelopment) {
        console.info(`[${formatted.timestamp}] [INFO]`, message, ...args);
      }
    }
  }

  warn(message, ...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage(LogLevel.WARN, message, ...args);
      if (this.isDevelopment || this.level <= LogLevel.WARN) {
        console.warn(`[${formatted.timestamp}] [WARN]`, message, ...args);
      }
      // In production, could send to error tracking service
      this.sendToErrorTracking(formatted);
    }
  }

  error(message, error, ...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage(LogLevel.ERROR, message, ...args);
      if (error instanceof Error) {
        formatted.error = {
          message: error.message,
          stack: error.stack,
          name: error.name
        };
      }

      if (this.isDevelopment) {
        console.error(`[${formatted.timestamp}] [ERROR]`, message, error, ...args);
      }

      // Always send errors to tracking in production
      this.sendToErrorTracking(formatted);
    }
  }

  sendToErrorTracking(logData) {
    // Only send to error tracking in production
    if (!this.isDevelopment && typeof window !== 'undefined') {
      // Could integrate with Sentry, LogRocket, etc.
      // For now, we'll store critical errors in localStorage for debugging
      if (logData.level === 'ERROR' || logData.level === 'WARN') {
        try {
          const errorLogs = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
          errorLogs.push(logData);
          // Keep only last 50 errors
          if (errorLogs.length > 50) {
            errorLogs.shift();
          }
          localStorage.setItem('app_error_logs', JSON.stringify(errorLogs));
        } catch (e) {
          // Silently fail if localStorage is not available
        }
      }
    }
  }

  clearErrorLogs() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_error_logs');
    }
  }

  getErrorLogs() {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('app_error_logs') || '[]');
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and class for testing
export default logger;
export { Logger, LogLevel };