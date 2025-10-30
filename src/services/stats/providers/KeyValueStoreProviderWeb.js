/**
 * KeyValueStoreProviderWeb - Web stub implementation for KeyValueStore
 *
 * This is a placeholder implementation for web platforms where NSUbiquitousKeyValueStore is not available.
 * It provides the same interface but returns "not available" for all operations.
 */

export class KeyValueStoreProviderWeb {
  constructor() {
    console.log('[KeyValueStoreProviderWeb] Web stub implementation - KeyValueStore not available on web');
  }

  async getValue({ key: _key }) {
    return {
      value: null,
      error: 'KeyValueStore is only available on iOS devices'
    };
  }

  async setValue({ key: _key, value: _value }) {
    return {
      success: false,
      error: 'KeyValueStore is only available on iOS devices'
    };
  }

  async removeValue({ key: _key }) {
    return {
      success: false,
      error: 'KeyValueStore is only available on iOS devices'
    };
  }

  async synchronize() {
    return {
      success: false,
      error: 'KeyValueStore is only available on iOS devices'
    };
  }

  async getStorageInfo() {
    return {
      used: 0,
      total: 0,
      available: false,
      error: 'KeyValueStore is only available on iOS devices'
    };
  }

  addListener(eventName, _callback) {
    // No-op for web
    console.log('[KeyValueStoreProviderWeb] Event listener not supported on web:', eventName);
    return {
      remove: () => {}
    };
  }
}

export default KeyValueStoreProviderWeb;