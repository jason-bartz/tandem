/**
 * Country flag utilities for co-op and leaderboard features.
 * Uses Vercel's free x-vercel-ip-country header for geo-detection.
 */

/**
 * Convert a 2-letter ISO country code to a flag emoji
 */
export function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/**
 * Extract country from request headers and update the user's record.
 * Best-effort — never throws.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID to update
 * @param {Request} request - Incoming request (for x-vercel-ip-country header)
 * @returns {{ countryCode: string|null, countryFlag: string|null }}
 */
export async function captureUserCountry(supabase, userId, request) {
  const countryCode = request.headers.get('x-vercel-ip-country') || null;
  const countryFlag = countryCodeToFlag(countryCode);

  if (countryCode && userId) {
    try {
      await supabase
        .from('users')
        .update({ country_code: countryCode, country_flag: countryFlag })
        .eq('id', userId);
    } catch {
      // Best effort — don't block on failure
    }
  }

  return { countryCode, countryFlag };
}
