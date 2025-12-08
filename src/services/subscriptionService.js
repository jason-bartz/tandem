/**
 * Unified Subscription Service
 * Routes to iOS or Web subscription service based on platform
 *
 * This service automatically detects the platform and delegates
 * to the appropriate subscription implementation:
 * - iOS: Uses Apple In-App Purchase (IAP) via cordova-plugin-purchase
 * - Web/Android: Uses Stripe via API routes and Supabase
 *
 * The interface is unified so components don't need to know
 * which platform they're running on.
 */

import { Capacitor } from '@capacitor/core';
import { getCurrentPuzzleNumber, getPuzzleNumberForDate } from '@/lib/puzzleNumber';

// Lazy load to avoid circular dependencies and optimize bundle size
let iOSService = null;
let webService = null;

class UnifiedSubscriptionService {
  constructor() {
    this.platform = null;
    this.service = null;
  }

  /**
   * Get the appropriate service for the current platform
   */
  async getService() {
    if (this.service) {
      return this.service;
    }

    // Detect platform
    this.platform = Capacitor.getPlatform();

    if (this.platform === 'ios') {
      if (!iOSService) {
        const iOSModule = await import('./iOSSubscriptionService.js');
        iOSService = iOSModule.default;
      }
      this.service = iOSService;
    } else {
      // Web platform (includes 'web', 'android', etc.)
      if (!webService) {
        const webModule = await import('./webSubscriptionService.js');
        webService = webModule.default;
      }
      this.service = webService;
    }

    return this.service;
  }

  /**
   * Initialize the subscription service
   */
  async initialize() {
    const service = await this.getService();
    return service.initialize();
  }

  /**
   * Check if subscription is active
   */
  async isSubscriptionActive() {
    const service = await this.getService();
    return service.isSubscriptionActive();
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus() {
    const service = await this.getService();
    return service.getSubscriptionStatus();
  }

  /**
   * Refresh subscription status
   */
  async refreshSubscriptionStatus() {
    const service = await this.getService();
    return service.refreshSubscriptionStatus();
  }

  /**
   * Check if user can access a puzzle
   * SYNCHRONOUS - Returns immediately using cached service
   */
  canAccessPuzzle(puzzleNumber) {
    // If service not loaded yet, default to today's puzzle only
    if (!this.service) {
      const currentPuzzleNumber = getCurrentPuzzleNumber();
      return puzzleNumber === currentPuzzleNumber;
    }
    return this.service.canAccessPuzzle(puzzleNumber);
  }

  /**
   * Check if user can access a puzzle by date
   * SYNCHRONOUS - Returns immediately using cached service
   */
  canAccessPuzzleByDate(dateString) {
    if (!this.service) {
      return this.canAccessPuzzle(getPuzzleNumberForDate(dateString));
    }
    return this.service.canAccessPuzzleByDate(dateString);
  }

  /**
   * Check if service is ready
   */
  async isReady() {
    const service = await this.getService();
    return service.isReady();
  }

  /**
   * Get products (for paywall display)
   */
  async getProducts() {
    const service = await this.getService();
    return service.getProducts();
  }

  /**
   * Get initialization state
   */
  async getInitState() {
    const service = await this.getService();
    return service.getInitState();
  }

  /**
   * Subscribe to state changes
   */
  async onStateChange(callback) {
    const service = await this.getService();
    return service.onStateChange(callback);
  }

  /**
   * iOS-specific: Purchase a product via IAP
   * Web will throw an error directing to use createCheckoutSession instead
   */
  async purchase(productId) {
    const service = await this.getService();
    if (this.platform !== 'ios') {
      throw new Error('Use createCheckoutSession() for web purchases');
    }
    return service.purchase(productId);
  }

  /**
   * iOS-specific: Restore purchases
   * Web will throw an error directing to use Stripe Customer Portal
   */
  async restorePurchases() {
    const service = await this.getService();
    if (this.platform !== 'ios') {
      throw new Error('Use Stripe Customer Portal for web subscription management');
    }
    return service.restorePurchases();
  }

  /**
   * Force re-initialization
   */
  async forceReinitialize() {
    const service = await this.getService();
    return service.forceReinitialize();
  }

  /**
   * Web-specific: Create Stripe checkout session
   * iOS will throw an error directing to use purchase() instead
   */
  async createCheckoutSession(tier) {
    const service = await this.getService();
    if (this.platform === 'ios') {
      throw new Error('Use purchase() for iOS IAP');
    }
    return service.createCheckoutSession(tier);
  }

  /**
   * Web-specific: Create Stripe customer portal session
   * iOS will throw an error directing to use App Store subscription management
   */
  async createPortalSession() {
    const service = await this.getService();
    if (this.platform === 'ios') {
      throw new Error('Use App Store subscription management for iOS');
    }
    return service.createPortalSession();
  }

  /**
   * Get current platform
   */
  getPlatform() {
    return this.platform || Capacitor.getPlatform();
  }
}

// Export singleton instance
const subscriptionService = new UnifiedSubscriptionService();
export default subscriptionService;

// Export INIT_STATE from iOS service for compatibility
// This will be dynamically loaded when needed
export const INIT_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  FAILED: 'FAILED',
};
