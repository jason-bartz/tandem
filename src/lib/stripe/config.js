import Stripe from 'stripe';

/**
 * Initialize Stripe with secret key (server-side only)
 * NEVER expose this client to the browser
 *
 * @returns {Stripe} Stripe instance configured with secret key
 */
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-10-28.acacia', // Latest stable version
    typescript: false,
  });
}

/**
 * Product tier to Stripe Price ID mapping
 * These map our internal tier names to Stripe price IDs
 *
 * Tiers:
 * - buddypass: Monthly subscription ($1.99/month)
 * - bestfriends: Yearly subscription ($14.99/year)
 * - soulmates: Lifetime access ($29.99 one-time)
 */
export const STRIPE_PRICES = {
  buddypass: process.env.STRIPE_PRICE_BUDDY_MONTHLY,
  bestfriends: process.env.STRIPE_PRICE_BESTFRIENDS_YEARLY,
  soulmates: process.env.STRIPE_PRICE_SOULMATES_LIFETIME,
};

/**
 * Validate tier and get price ID
 *
 * @param {string} tier - One of: 'buddypass', 'bestfriends', 'soulmates'
 * @returns {string} Stripe price ID
 * @throws {Error} If tier is invalid or price ID not configured
 */
export function getPriceId(tier) {
  const priceId = STRIPE_PRICES[tier];

  if (!priceId) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: ${Object.keys(STRIPE_PRICES).join(', ')}`);
  }

  return priceId;
}

/**
 * Determine checkout mode based on tier
 * Subscription mode for recurring payments, payment mode for one-time purchases
 *
 * @param {string} tier - Product tier
 * @returns {string} 'subscription' or 'payment'
 */
export function getCheckoutMode(tier) {
  return tier === 'soulmates' ? 'payment' : 'subscription';
}

/**
 * Get display names for tiers
 *
 * @param {string} tier - Product tier
 * @returns {string} Display name
 */
export function getTierDisplayName(tier) {
  const names = {
    buddypass: 'Buddy Pass',
    bestfriends: 'Best Friends',
    soulmates: 'Soulmates',
  };
  return names[tier] || tier;
}
