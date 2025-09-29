/**
 * Centralized error handling service
 * Provides consistent error handling across the application
 */

import logger from './logger';

class ErrorHandler {
  constructor() {
    this.errorCallbacks = [];
    this.isInitialized = false;
  }

  /**
   * Initialize global error handlers
   */
  initialize() {
    if (this.isInitialized || typeof window === 'undefined') {return;}

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled Promise Rejection', event.reason);
      this.handleError(event.reason, 'PROMISE_REJECTION');
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      logger.error('Global Error', event.error || event.message);
      this.handleError(event.error || new Error(event.message), 'GLOBAL_ERROR');
    });

    this.isInitialized = true;
  }

  /**
   * Main error handling method
   */
  handleError(error, context = 'UNKNOWN', metadata = {}) {
    // Normalize error object
    const normalizedError = this.normalizeError(error);

    // Log the error
    logger.error(`Error in context: ${context}`, normalizedError, metadata);

    // Determine error severity
    const severity = this.getErrorSeverity(normalizedError, context);

    // Create error report
    const errorReport = {
      error: normalizedError,
      context,
      metadata,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    };

    // Call registered callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(errorReport);
      } catch (callbackError) {
        logger.error('Error in error callback', callbackError);
      }
    });

    // Handle based on severity
    this.handleBySeverity(errorReport);

    return errorReport;
  }

  /**
   * Normalize error to consistent format
   */
  normalizeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      };
    }

    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error,
        stack: new Error().stack
      };
    }

    return {
      name: 'UnknownError',
      message: JSON.stringify(error),
      stack: new Error().stack
    };
  }

  /**
   * Determine error severity
   */
  getErrorSeverity(error, context) {
    // Critical errors
    if (
      context === 'AUTH_ERROR' ||
      context === 'PAYMENT_ERROR' ||
      error.message?.includes('SecurityError')
    ) {
      return 'CRITICAL';
    }

    // High severity
    if (
      context === 'API_ERROR' ||
      context === 'DATABASE_ERROR' ||
      error.message?.includes('NetworkError')
    ) {
      return 'HIGH';
    }

    // Medium severity
    if (
      context === 'VALIDATION_ERROR' ||
      context === 'USER_INPUT_ERROR'
    ) {
      return 'MEDIUM';
    }

    // Low severity
    return 'LOW';
  }

  /**
   * Handle error based on severity
   */
  handleBySeverity(errorReport) {
    switch (errorReport.severity) {
      case 'CRITICAL':
        // Could send immediate notification
        this.notifyUser('A critical error occurred. Please refresh the page.');
        break;
      case 'HIGH':
        // Log for monitoring
        this.notifyUser('An error occurred. Please try again.');
        break;
      case 'MEDIUM':
        // Silent logging
        break;
      case 'LOW':
        // Development logging only
        break;
    }
  }

  /**
   * Notify user of error
   */
  notifyUser(message, type = 'error') {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {return;}

    // Could integrate with a toast notification system
    // For now, we'll dispatch a custom event
    const event = new CustomEvent('app-error', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }

  /**
   * Register error callback
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
    }
  }

  /**
   * Remove error callback
   */
  offError(callback) {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  /**
   * API Error Handler
   */
  handleApiError(error, endpoint, method) {
    const metadata = {
      endpoint,
      method,
      status: error.status || 'Unknown',
      statusText: error.statusText || 'Unknown'
    };

    return this.handleError(error, 'API_ERROR', metadata);
  }

  /**
   * Validation Error Handler
   */
  handleValidationError(errors, form) {
    const metadata = {
      form,
      errors: Array.isArray(errors) ? errors : [errors]
    };

    return this.handleError(
      new Error('Validation failed'),
      'VALIDATION_ERROR',
      metadata
    );
  }

  /**
   * Network Error Handler
   */
  handleNetworkError(error, url) {
    const metadata = {
      url,
      online: navigator.onLine
    };

    return this.handleError(error, 'NETWORK_ERROR', metadata);
  }

  /**
   * Clear error logs
   */
  clearErrorLogs() {
    logger.clearErrorLogs();
  }

  /**
   * Get error logs
   */
  getErrorLogs() {
    return logger.getErrorLogs();
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  errorHandler.initialize();
}

export default errorHandler;