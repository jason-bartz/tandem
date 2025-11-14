/**
 * Web Subscription Service
 * Uses secure API routes (no direct DB access from browser)
 * Mirrors iOS subscription service interface for compatibility
 */

import { getCurrentPuzzleNumber, getPuzzleNumberForDate } from '@/lib/puzzleNumber';

// Initialization states (matching iOS interface)
const INIT_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  FAILED: 'FAILED',
};

// Cache key for raw subscription data
const CACHE_KEY = 'tandem_subscription_raw';

class WebSubscriptionService {
  constructor() {
    this.subscriptionStatus = null;
    this.loading = false;
    this.initState = INIT_STATE.NOT_STARTED;
    this.initPromise = null;

    // Eager hydration from localStorage on construction
    this.hydrateFromCache();
  }

  /**
   * Hydrate subscription status from localStorage cache
   * Called immediately on service construction for instant availability
   */
  hydrateFromCache() {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Reconstruct Date object if present
        if (parsed.expiryDate) {
          parsed.expiryDate = new Date(parsed.expiryDate);
        }
        this.subscriptionStatus = parsed;
      }
    } catch (error) {
      console.error('[WebSubscriptionService] Failed to hydrate from cache:', error);
      this.subscriptionStatus = null;
    }
  }

  /**
   * Get current initialization state
   * @returns {string} One of INIT_STATE values
   */
  getInitState() {
    return this.initState;
  }

  /**
   * Add a listener for initialization state changes (no-op for web, for compatibility)
   * @param {Function} _callback - Called with (newState, oldState)
   * @returns {Function} Unsubscribe function
   */
  onStateChange(_callback) {
    // Web is always ready, so this is a no-op
    return () => {};
  }

  /**
   * Initialize (no-op for web, kept for interface compatibility)
   * Web subscription service is always ready
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initState = INIT_STATE.INITIALIZING;
    this.initPromise = this.loadSubscriptionStatus().then(() => {
      this.initState = INIT_STATE.READY;
    });

    return this.initPromise;
  }

  /**
   * Force re-initialization (for web, just reloads status)
   */
  async forceReinitialize() {
    this.initPromise = null;
    this.initState = INIT_STATE.NOT_STARTED;
    return this.initialize();
  }

  /**
   * Load subscription status from API
   * Uses cache-first strategy: returns cached data immediately if available,
   * then updates in background
   */
  async loadSubscriptionStatus() {
    try {
      // Get the Supabase session token from localStorage
      const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();

      // Try to refresh session first, but don't fail if it doesn't work
      // (user might not be authenticated)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/subscription/status', {
        headers,
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        // Not authenticated or no subscription
        const clearedStatus = { isActive: false };
        this.subscriptionStatus = clearedStatus;

        // Clear cache when not authenticated
        this.clearCache();
        return;
      }

      const data = await response.json();
      const newStatus = {
        isActive: data.isActive || false,
        productId: data.tier || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      };

      this.subscriptionStatus = newStatus;

      // Update cache with new data
      this.updateCache(newStatus);
    } catch (error) {
      console.error('[WebSubscriptionService] Failed to load subscription status:', error);

      // On error, keep cached status if available, otherwise mark as inactive
      if (!this.subscriptionStatus) {
        this.subscriptionStatus = { isActive: false };
      }
    }
  }

  /**
   * Update localStorage cache with current subscription status
   */
  updateCache(status) {
    if (typeof window === 'undefined') return;

    try {
      // Serialize Date objects for storage
      const cacheData = {
        ...status,
        expiryDate: status.expiryDate?.toISOString() || null,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.error('[WebSubscriptionService] Failed to update cache:', error);
    }
  }

  /**
   * Clear localStorage cache
   */
  clearCache() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('[WebSubscriptionService] Failed to clear cache:', error);
    }
  }

  /**
   * Refresh subscription status
   */
  async refreshSubscriptionStatus() {
    await this.loadSubscriptionStatus();
    return this.subscriptionStatus;
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive() {
    return this.subscriptionStatus?.isActive || false;
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus() {
    return this.subscriptionStatus;
  }

  /**
   * Check if user can access a puzzle by number
   * Same logic as iOS: current day + 3 days back = 4 days free
   */
  canAccessPuzzle(puzzleNumber) {
    const currentPuzzleNumber = getCurrentPuzzleNumber();
    const oldestFreePuzzle = currentPuzzleNumber - 3;

    // Free access to last 4 days
    if (puzzleNumber >= oldestFreePuzzle && puzzleNumber <= currentPuzzleNumber) {
      return true;
    }

    // Check subscription for older puzzles
    return this.isSubscriptionActive();
  }

  /**
   * Check if user can access a puzzle by date
   */
  canAccessPuzzleByDate(dateString) {
    const puzzleNumber = getPuzzleNumberForDate(dateString);
    return this.canAccessPuzzle(puzzleNumber);
  }

  /**
   * Create Stripe checkout session
   * Redirects to Stripe hosted checkout
   */
  async createCheckoutSession(tier) {
    this.loading = true;

    try {
      // Get the Supabase session token from localStorage
      const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();

      // IMPORTANT: Refresh the session to ensure we have a valid, non-expired token
      // This is critical for production where sessions may have expired
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.refreshSession();

      if (sessionError || !session?.access_token) {
        // If refresh fails, try getting the existing session as fallback
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (!existingSession?.access_token) {
          throw new Error('Not authenticated. Please sign in again.');
        }

        // Use existing session if available
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${existingSession.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ tier }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create checkout session');
        }

        const data = await response.json();
        window.location.href = data.url;
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      this.loading = false;
      throw error;
    }
  }

  /**
   * Create Stripe customer portal session
   * For managing existing subscription
   */
  async createPortalSession() {
    try {
      // Get the Supabase session token from localStorage
      const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();

      // IMPORTANT: Refresh the session to ensure we have a valid, non-expired token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.refreshSession();

      if (sessionError || !session?.access_token) {
        // If refresh fails, try getting the existing session as fallback
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (!existingSession?.access_token) {
          throw new Error('Not authenticated. Please sign in again.');
        }

        const response = await fetch('/api/stripe/create-portal-session', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${existingSession.access_token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create portal session');
        }

        const data = await response.json();
        window.location.href = data.url;
        return;
      }

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const data = await response.json();

      // Redirect to Stripe customer portal
      window.location.href = data.url;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if service is ready (always true for web)
   */
  isReady() {
    return this.initState === INIT_STATE.READY;
  }

  /**
   * Get products (for display in paywall)
   * Returns static product info for web
   */
  getProducts() {
    return {
      buddypass: {
        id: 'buddypass',
        title: 'Buddy Pass',
        description: 'Monthly subscription',
        price: '$1.99',
        pricing: { price: '$1.99' },
        valid: true,
        canPurchase: true,
      },
      bestfriends: {
        id: 'bestfriends',
        title: 'Best Friends',
        description: 'Yearly subscription',
        price: '$14.99',
        pricing: { price: '$14.99' },
        valid: true,
        canPurchase: true,
      },
      soulmates: {
        id: 'soulmates',
        title: 'Soulmates',
        description: 'Lifetime access',
        price: '$29.99',
        pricing: { price: '$29.99' },
        valid: true,
        canPurchase: true,
      },
    };
  }
}

// Export singleton instance
const webSubscriptionService = new WebSubscriptionService();
export default webSubscriptionService;

// Export INIT_STATE for compatibility
export { INIT_STATE };
