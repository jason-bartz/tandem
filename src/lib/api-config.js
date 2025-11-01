/**
 * API Configuration
 *
 * Handles API endpoint URLs and HTTP requests for different environments:
 * - Web: Uses relative URLs (same domain) with standard fetch
 * - iOS/Capacitor: Uses absolute production URLs with Capacitor HTTP (bypasses CORS)
 *
 * This is necessary because iOS builds are static exports
 * and cannot have API routes. They must call the production API.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Get the base API URL based on the platform
 * @returns {string} The base API URL (empty string for web, full URL for native)
 */
export function getApiBaseUrl() {
  // On native platforms (iOS/Android), use production API
  if (Capacitor.isNativePlatform()) {
    return process.env.NEXT_PUBLIC_API_URL || 'https://tandemdaily.com';
  }

  // On web, use relative URLs (same domain)
  return '';
}

/**
 * Get full API endpoint URL
 * @param {string} path - API path (e.g., '/api/account/delete')
 * @returns {string} Full API URL
 */
export function getApiUrl(path) {
  const baseUrl = getApiBaseUrl();

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

/**
 * Check if we should use absolute URLs
 * @returns {boolean}
 */
export function shouldUseAbsoluteUrls() {
  return Capacitor.isNativePlatform();
}

/**
 * Perform HTTP request using Capacitor HTTP on native or fetch on web
 * This bypasses CORS on native platforms
 *
 * @param {string} url - Full URL to request
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} Response object compatible with fetch API
 */
export async function capacitorFetch(url, options = {}) {
  // On native platforms, use Capacitor HTTP to bypass CORS
  if (Capacitor.isNativePlatform()) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core');

      // Convert fetch options to Capacitor HTTP options
      // Capacitor HTTP uses headers directly, so we need to preserve case
      const headers = options.headers || {};
      const capOptions = {
        url,
        method: options.method || 'GET',
        headers: headers,
      };

      // Handle body
      if (options.body) {
        if (typeof options.body === 'string') {
          capOptions.data = JSON.parse(options.body);
        } else {
          capOptions.data = options.body;
        }
      }

      console.log('[CapacitorFetch] Using native HTTP:', {
        url,
        method: capOptions.method,
        headers: capOptions.headers,
        hasData: !!capOptions.data,
      });

      // Make request using Capacitor HTTP
      const response = await CapacitorHttp.request(capOptions);

      console.log('[CapacitorFetch] Response received:', {
        status: response.status,
        headers: response.headers,
        hasData: !!response.data,
      });

      // Convert Capacitor response to fetch-like Response object
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.status.toString(),
        headers: {
          get: (name) => response.headers[name] || response.headers[name.toLowerCase()],
        },
        json: async () => response.data,
        text: async () =>
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        url: response.url || url,
      };
    } catch (error) {
      console.error('[CapacitorFetch] Error:', error);
      throw error;
    }
  }

  // On web, use standard fetch
  return fetch(url, options);
}

export default {
  getApiBaseUrl,
  getApiUrl,
  shouldUseAbsoluteUrls,
  capacitorFetch,
};
