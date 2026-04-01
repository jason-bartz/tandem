/**
 * Email Unsubscribe Utilities
 *
 * HMAC-based unsubscribe link generation and verification.
 * Uses JWT_SECRET to sign email addresses — no per-user tokens needed.
 *
 * @module unsubscribe
 */

import crypto from 'crypto';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://tandemdaily.com';

/**
 * Generate an HMAC signature for an email address
 * @param {string} email
 * @returns {string} hex-encoded HMAC signature
 */
export function generateUnsubscribeToken(email) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  return crypto.createHmac('sha256', secret).update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Verify an HMAC signature for an email address
 * @param {string} email
 * @param {string} token
 * @returns {boolean}
 */
export function verifyUnsubscribeToken(email, token) {
  if (!email || !token) return false;

  try {
    const expected = generateUnsubscribeToken(email);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

/**
 * Generate a full unsubscribe URL for an email address
 * @param {string} email
 * @returns {string} Full URL with email and token params
 */
export function generateUnsubscribeUrl(email) {
  const token = generateUnsubscribeToken(email);
  const params = new URLSearchParams({
    email: email.toLowerCase().trim(),
    token,
  });
  return `${SITE_URL}/api/email/unsubscribe?${params.toString()}`;
}
