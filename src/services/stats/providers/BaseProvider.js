/**
 * BaseProvider - Abstract base class for sync providers
 *
 * Defines the interface that all sync providers must implement.
 * Provides common functionality and error handling.
 */

export class BaseProvider {
  constructor(name) {
    this.name = name;
    this.available = false;
    this.initialized = false;
    this.lastError = null;
    this.lastSyncTime = null;
    this.config = {};
    this.stats = {
      fetchCount: 0,
      saveCount: 0,
      fetchErrors: 0,
      saveErrors: 0,
      averageFetchTime: 0,
      averageSaveTime: 0,
    };
  }

  /**
   * Initialize the provider
   * Must be implemented by subclasses
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Check if provider is available
   * Must be implemented by subclasses
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Fetch data from the provider
   * Must be implemented by subclasses
   */
  async fetch() {
    throw new Error('fetch() must be implemented by subclass');
  }

  /**
   * Save data to the provider
   * Must be implemented by subclasses
   */
  async save(_data) {
    throw new Error('save() must be implemented by subclass');
  }

  /**
   * Clear all data from the provider
   * Optional - subclasses can override
   */
  async clear() {
    console.warn(`[${this.name}] Clear not implemented`);
    return false;
  }

  /**
   * Delete specific records
   * Optional - subclasses can override
   */
  async delete(_ids) {
    console.warn(`[${this.name}] Delete not implemented`);
    return false;
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      name: this.name,
      available: this.available,
      initialized: this.initialized,
      lastError: this.lastError,
      lastSyncTime: this.lastSyncTime,
      stats: { ...this.stats },
    };
  }

  /**
   * Record fetch timing
   */
  recordFetchTime(duration) {
    this.stats.fetchCount++;
    const totalTime = this.stats.averageFetchTime * (this.stats.fetchCount - 1);
    this.stats.averageFetchTime = (totalTime + duration) / this.stats.fetchCount;
  }

  /**
   * Record save timing
   */
  recordSaveTime(duration) {
    this.stats.saveCount++;
    const totalTime = this.stats.averageSaveTime * (this.stats.saveCount - 1);
    this.stats.averageSaveTime = (totalTime + duration) / this.stats.saveCount;
  }

  /**
   * Record fetch error
   */
  recordFetchError(error) {
    this.stats.fetchErrors++;
    this.lastError = {
      type: 'fetch',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record save error
   */
  recordSaveError(error) {
    this.stats.saveErrors++;
    this.lastError = {
      type: 'save',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate data structure
   */
  validateData(data) {
    if (!data) {
      throw new Error('Data is required');
    }

    if (typeof data !== 'object') {
      throw new Error('Data must be an object');
    }

    // Validate required fields
    const requiredFields = ['stats', 'events', 'timestamp', 'version'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate version
    if (typeof data.version !== 'number' || data.version < 1) {
      throw new Error('Invalid version');
    }

    // Validate timestamp
    if (!this.isValidTimestamp(data.timestamp)) {
      throw new Error('Invalid timestamp');
    }

    return true;
  }

  /**
   * Check if timestamp is valid
   */
  isValidTimestamp(timestamp) {
    if (typeof timestamp !== 'string') return false;

    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  /**
   * Serialize data for storage
   */
  serialize(data) {
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new Error(`Failed to serialize data: ${error.message}`);
    }
  }

  /**
   * Deserialize data from storage
   */
  deserialize(data) {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      throw new Error(`Failed to deserialize data: ${error.message}`);
    }
  }

  /**
   * Handle provider-specific errors
   */
  handleError(error, operation) {
    console.error(`[${this.name}] ${operation} failed:`, error);

    if (operation === 'fetch') {
      this.recordFetchError(error);
    } else if (operation === 'save') {
      this.recordSaveError(error);
    }

    // Check for specific error types
    if (this.isNetworkError(error)) {
      throw new Error(`Network error: ${error.message}`);
    }

    if (this.isAuthError(error)) {
      this.available = false;
      throw new Error(`Authentication error: ${error.message}`);
    }

    if (this.isQuotaError(error)) {
      throw new Error(`Quota exceeded: ${error.message}`);
    }

    // Generic error
    throw error;
  }

  /**
   * Check if error is network related
   */
  isNetworkError(error) {
    const networkErrors = [
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
    ];

    return networkErrors.some((msg) => error.message?.includes(msg) || error.code === msg);
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(error) {
    const authErrors = [
      'Unauthorized',
      'Authentication required',
      'Invalid credentials',
      'Token expired',
      'AUTH_ERROR',
      '401',
    ];

    return authErrors.some(
      (msg) => error.message?.includes(msg) || error.code === msg || error.status === 401
    );
  }

  /**
   * Check if error is quota related
   */
  isQuotaError(error) {
    const quotaErrors = [
      'QuotaExceededError',
      'Quota exceeded',
      'Storage quota',
      'QUOTA_EXCEEDED',
      '507',
    ];

    return quotaErrors.some(
      (msg) => error.message?.includes(msg) || error.code === msg || error.status === 507
    );
  }

  /**
   * Wait with timeout
   */
  async withTimeout(promise, timeoutMs = 30000) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    );

    return Promise.race([promise, timeout]);
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(operation, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry auth errors
        if (this.isAuthError(error)) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, i), 10000);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

export default BaseProvider;
