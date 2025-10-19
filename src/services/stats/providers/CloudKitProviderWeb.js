/**
 * CloudKitProviderWeb - Web stub implementation for CloudKit
 *
 * This is a placeholder implementation for web platforms where CloudKit is not available.
 * It provides the same interface but returns "not available" for all operations.
 */

export class CloudKitProviderWeb {
  constructor() {
    console.log('[CloudKitProviderWeb] Web stub implementation - CloudKit not available on web');
  }

  async checkAccountStatus() {
    return {
      available: false,
      status: 'notAvailable',
      message: 'CloudKit is only available on iOS devices'
    };
  }

  async fetchStats() {
    return {
      stats: null,
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async syncStats() {
    return {
      success: false,
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async fetchPuzzleResults() {
    return {
      results: [],
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async syncPuzzleResult() {
    return {
      success: false,
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async fetchPreferences() {
    return {
      preferences: {},
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async syncPreferences() {
    return {
      success: false,
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async clearCloudData() {
    return {
      success: false,
      error: 'CloudKit is only available on iOS devices'
    };
  }

  async performFullSync() {
    return {
      success: false,
      error: 'CloudKit is only available on iOS devices'
    };
  }
}

export default CloudKitProviderWeb;