/**
 * Production-ready centralized logging service for web and iOS platforms
 * Features:
 * - Environment-aware logging (quiet in production)
 * - Structured JSON logging
 * - Request correlation IDs
 * - Automatic data sanitization
 * - Performance timing helpers
 * - Log sampling for high-frequency events
 */

/* eslint-disable no-console */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Patterns to sanitize from logs
const SENSITIVE_PATTERNS = [
  /password["\s:=]+["']?([^"'\s,}]+)/gi,
  /api[_-]?key["\s:=]+["']?([^"'\s,}]+)/gi,
  /token["\s:=]+["']?([^"'\s,}]+)/gi,
  /secret["\s:=]+["']?([^"'\s,}]+)/gi,
  /authorization["\s:=]+bearer\s+([^\s,}]+)/gi,
  /sk-ant-[a-zA-Z0-9-_]+/gi, // Anthropic API keys
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
];

class Logger {
  constructor() {
    this.level = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    this.isIOS = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
    this.requestId = null;
    this.samplingRate = this.getSamplingRate();
    this.enableDebugLogs = this.getDebugLogsEnabled();
  }

  getLogLevel() {
    if (typeof process !== 'undefined' && process.env) {
      const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;
      if (envLevel && LogLevel[envLevel.toUpperCase()] !== undefined) {
        return LogLevel[envLevel.toUpperCase()];
      }
    }

    // Default to ERROR in production, DEBUG in development
    return process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG;
  }

  getSamplingRate() {
    const rate = parseFloat(process.env.LOG_SAMPLING_RATE || '1.0');
    return Math.max(0, Math.min(1, rate)); // Clamp between 0 and 1
  }

  getDebugLogsEnabled() {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true';
    }
    return false;
  }

  /**
   * Set correlation ID for request tracing
   */
  setRequestId(id) {
    this.requestId = id;
  }

  /**
   * Get current correlation ID
   */
  getRequestId() {
    return this.requestId;
  }

  /**
   * Clear correlation ID
   */
  clearRequestId() {
    this.requestId = null;
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeData(data) {
    if (!data) return data;

    const stringified = typeof data === 'string' ? data : JSON.stringify(data);
    let sanitized = stringified;

    SENSITIVE_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, (match, group1) => {
        return match.replace(group1, '***REDACTED***');
      });
    });

    // Return in original format
    return typeof data === 'string' ? sanitized : JSON.parse(sanitized);
  }

  /**
   * Check if this log should be sampled (for high-frequency logs)
   */
  shouldSample() {
    return Math.random() < this.samplingRate;
  }

  /**
   * Format message for output
   */
  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LogLevel).find((key) => LogLevel[key] === level);

    const formatted = {
      timestamp,
      level: levelName,
      message: this.sanitizeData(message),
      platform: this.isIOS ? 'iOS' : 'Web',
    };

    // Add correlation ID if present
    if (this.requestId) {
      formatted.requestId = this.requestId;
    }

    // Add sanitized data if present
    if (args.length > 0) {
      formatted.data = this.sanitizeData(args);
    }

    return formatted;
  }

  /**
   * Format for console output (human-readable in dev, JSON in prod)
   */
  formatForConsole(formatted) {
    if (this.isDevelopment) {
      return `[${formatted.timestamp}] [${formatted.level}]${formatted.requestId ? ` [${formatted.requestId}]` : ''}`;
    }
    // Production: structured JSON
    return JSON.stringify(formatted);
  }

  shouldLog(level) {
    // Never log in test environment unless explicitly enabled
    if (this.isTest && !this.enableDebugLogs) {
      return false;
    }
    return level >= this.level;
  }

  debug(message, ...args) {
    if (!this.isDevelopment && !this.enableDebugLogs) {
      return;
    }

    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, ...args);
      if (this.isDevelopment) {
        console.debug(
          this.formatForConsole(formatted),
          formatted.message,
          ...(formatted.data || [])
        );
      }
    }
  }

  info(message, ...args) {
    // INFO logs are suppressed in production unless debug logs are enabled
    if (!this.isDevelopment && !this.enableDebugLogs) {
      return;
    }

    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage(LogLevel.INFO, message, ...args);
      if (this.isDevelopment) {
        console.info(
          this.formatForConsole(formatted),
          formatted.message,
          ...(formatted.data || [])
        );
      }
    }
  }

  warn(message, ...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage(LogLevel.WARN, message, ...args);

      // Always output warnings (but sanitized)
      if (this.isDevelopment) {
        console.warn(
          this.formatForConsole(formatted),
          formatted.message,
          ...(formatted.data || [])
        );
      } else {
        // Production: structured JSON to stderr
        console.error(this.formatForConsole(formatted));
      }
    }
  }

  error(message, error, ...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage(LogLevel.ERROR, message, ...args);

      if (error instanceof Error) {
        formatted.error = {
          message: error.message,
          stack: this.isDevelopment ? error.stack : error.stack?.split('\n')[0], // Only first line in prod
          name: error.name,
          code: error.code,
        };
      }

      // Always output errors
      if (this.isDevelopment) {
        console.error(
          this.formatForConsole(formatted),
          formatted.message,
          error,
          ...(formatted.data || [])
        );
      } else {
        // Production: structured JSON to stderr
        console.error(this.formatForConsole(formatted));
      }
    }
  }

  /**
   * Performance timing helper - start timer
   */
  time(label) {
    if (this.isDevelopment) {
      console.time(label);
    }
    return Date.now();
  }

  /**
   * Performance timing helper - end timer
   */
  timeEnd(label, startTime) {
    const duration = Date.now() - startTime;

    if (this.isDevelopment) {
      console.timeEnd(label);
    }

    return duration;
  }

  /**
   * Log with sampling (for high-frequency events)
   */
  sample(level, message, ...args) {
    if (!this.shouldSample()) {
      return;
    }

    switch (level) {
      case 'debug':
        this.debug(message, ...args);
        break;
      case 'info':
        this.info(message, ...args);
        break;
      case 'warn':
        this.warn(message, ...args);
        break;
      case 'error':
        this.error(message, null, ...args);
        break;
    }
  }

  /**
   * API request logging helper
   */
  logRequest(method, path, status, duration) {
    if (!this.isDevelopment) {
      return; // Only log requests in development
    }

    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${path} ${status} ${duration}ms`;

    if (this.shouldLog(level)) {
      const formatted = this.formatMessage(level, message);
      console.log(this.formatForConsole(formatted), message);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and class for testing
export default logger;
export { Logger, LogLevel };
