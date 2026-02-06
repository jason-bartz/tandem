/**
 * Standalone mode detection for Daily Alchemy (dailyalchemy.fun)
 *
 * When NEXT_PUBLIC_STANDALONE_ALCHEMY is true, the app runs as a
 * standalone Daily Alchemy site with no other games, no subscription
 * paywall, and ad support.
 */
export const isStandaloneAlchemy = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';
export const isAdSupported = process.env.NEXT_PUBLIC_AD_SUPPORTED === 'true';
