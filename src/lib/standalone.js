/**
 * Standalone mode detection for Daily Alchemy (dailyalchemy.fun)
 *
 * Detected via:
 * 1. NEXT_PUBLIC_STANDALONE_ALCHEMY env var (build-time, works on server and client)
 * 2. Hostname check for dailyalchemy.fun (runtime, client-side only)
 *
 * When standalone, the app runs as a single Daily Alchemy site with no
 * other games, no subscription paywall, and ad support.
 */
const DAILY_ALCHEMY_HOSTS = ['dailyalchemy.fun', 'www.dailyalchemy.fun'];

export const isStandaloneAlchemy =
  process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true' ||
  (typeof window !== 'undefined' && DAILY_ALCHEMY_HOSTS.includes(window.location.hostname));

export const isAdSupported = process.env.NEXT_PUBLIC_AD_SUPPORTED === 'true';
