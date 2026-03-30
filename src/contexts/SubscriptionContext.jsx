'use client';

import { createContext, useContext, useCallback } from 'react';

const SubscriptionContext = createContext({
  isActive: true,
  tier: 'free',
  expiryDate: null,
  cancelAtPeriodEnd: false,
  loading: false,
  refreshStatus: async () => {},
});

/**
 * SubscriptionProvider - Global subscription state management
 *
 * On web, everything is free — isActive is always true.
 * iOS retains StoreKit-based subscription logic via the native app.
 */
export function SubscriptionProvider({ children }) {
  const refreshStatus = useCallback(async () => {}, []);

  // On web, everything is free and unlocked
  const value = {
    isActive: true,
    tier: 'free',
    expiryDate: null,
    cancelAtPeriodEnd: false,
    loading: false,
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
