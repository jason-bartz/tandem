'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionService from '@/services/subscriptionService';

const CACHE_KEY = 'tandem_subscription_cache';

const SubscriptionContext = createContext({
  isActive: false,
  tier: null,
  expiryDate: null,
  cancelAtPeriodEnd: false,
  loading: true,
  refreshStatus: async () => {},
});

/**
 * SubscriptionProvider - Global subscription state management
 *
 * This provider wraps the app and provides subscription state to all components.
 * It eagerly hydrates from localStorage for instant display, then refreshes
 * in the background for accuracy.
 *
 * Features:
 * - Instant state hydration from localStorage (0ms)
 * - Automatic refresh when auth state changes
 * - Background updates without blocking UI
 * - Automatic cache invalidation on sign out
 * - Reactive updates across all components
 *
 * Usage:
 * ```jsx
 * import { useSubscription } from '@/contexts/SubscriptionContext';
 *
 * function MyComponent() {
 *   const { isActive, tier, refreshStatus } = useSubscription();
 *   // ...
 * }
 * ```
 */
export function SubscriptionProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  // Eager hydration from localStorage
  const [subscription, setSubscription] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Return cached state with loading: false to show immediately
          return {
            isActive: parsed.isActive || false,
            tier: parsed.tier || null,
            expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
            cancelAtPeriodEnd: parsed.cancelAtPeriodEnd || false,
            loading: false, // Show cached state immediately
          };
        } catch (error) {
          console.error('[SubscriptionContext] Failed to parse cached subscription:', error);
        }
      }
    }

    // No cache available - show loading state
    return {
      isActive: false,
      tier: null,
      expiryDate: null,
      cancelAtPeriodEnd: false,
      loading: true,
    };
  });

  /**
   * Refresh subscription status from API
   * Caches result to localStorage for next load
   */
  const refreshStatus = useCallback(async () => {
    // If not authenticated, clear subscription state
    if (!user) {
      const clearedState = {
        isActive: false,
        tier: null,
        expiryDate: null,
        cancelAtPeriodEnd: false,
        loading: false,
      };

      setSubscription(clearedState);

      // Clear cache on sign out
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (error) {
        console.error('[SubscriptionContext] Failed to clear cache:', error);
      }

      return;
    }

    try {
      // Initialize subscription service if needed
      await subscriptionService.initialize();

      // Get current subscription status
      const status = await subscriptionService.getSubscriptionStatus();

      const newState = {
        isActive: status?.isActive || false,
        tier: status?.productId || null,
        expiryDate: status?.expiryDate || null,
        cancelAtPeriodEnd: status?.cancelAtPeriodEnd || false,
        loading: false,
      };

      // Update context state
      setSubscription(newState);

      // Cache for next load (serialize Date objects)
      try {
        const cacheData = {
          ...newState,
          expiryDate: newState.expiryDate?.toISOString() || null,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        // Handle quota exceeded or other storage errors
        console.error('[SubscriptionContext] Failed to cache subscription:', error);
      }
    } catch (error) {
      console.error('[SubscriptionContext] Failed to refresh subscription:', error);

      // On error, keep cached state but mark as not loading
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  /**
   * Auto-refresh subscription when auth state changes
   * This ensures subscription is always in sync with auth
   */
  useEffect(() => {
    if (!authLoading) {
      // Auth has loaded, now refresh subscription
      refreshStatus();
    }
  }, [user, authLoading, refreshStatus]);

  const value = {
    isActive: subscription.isActive,
    tier: subscription.tier,
    expiryDate: subscription.expiryDate,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    loading: subscription.loading,
    refreshStatus,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/**
 * useSubscription hook - Access subscription state and methods
 *
 * @returns {Object} Subscription context value
 * @property {boolean} isActive - Whether subscription is currently active
 * @property {string|null} tier - Subscription tier ('buddypass', 'bestfriends', 'soulmates')
 * @property {Date|null} expiryDate - When subscription expires
 * @property {boolean} cancelAtPeriodEnd - Whether subscription will auto-renew
 * @property {boolean} loading - Whether subscription status is being loaded
 * @property {Function} refreshStatus - Manually refresh subscription status
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }

  return context;
}
