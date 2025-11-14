/**
 * Profanity Filter for Usernames
 *
 * Professional mobile game development best practices for content moderation:
 * - Multi-layered filtering approach (exact match, fuzzy match, pattern detection)
 * - Leetspeak detection (4 -> a, 3 -> e, etc.) - BUT ONLY for profanity detection
 * - Zero-width character detection
 * - Character substitution detection
 * - Prefix/suffix detection for impersonation
 *
 * PHILOSOPHY:
 * ✅ ALLOW: Leetspeak in general (L33tG4m3r, Pr0Puzzl3r, etc.)
 * ✅ ALLOW: Gaming culture terms (noob, gg, rekt, etc.)
 * ✅ ALLOW: Creative expression and personality
 * ❌ BLOCK: Profanity (even disguised with leetspeak)
 * ❌ BLOCK: Hate speech and slurs
 * ❌ BLOCK: Staff impersonation
 *
 * The filter normalizes leetspeak ONLY to check if it's hiding inappropriate
 * content. If the normalized version is clean, the original leetspeak username
 * is accepted.
 *
 * Based on standards from:
 * - Apple App Store Review Guidelines (5.1.1)
 * - Google Play Developer Policy
 * - COPPA compliance
 * - Industry-standard games (Roblox, Among Us, Club Penguin)
 */

/**
 * Profanity word list - Base list of inappropriate terms
 * Following mobile game standards, this includes:
 * - Profanity and vulgar language
 * - Hate speech and slurs
 * - Sexual content
 * - Drug references
 * - Violent threats
 *
 * NOTE: This is a starter list. For production, consider using a professional
 * service like CleanSpeak, Sift, or WebPurify for comprehensive filtering.
 */
const PROFANITY_LIST = [
  // Common profanity (basic tier)
  'damn',
  'hell',
  'crap',
  'piss',
  'ass',
  'bastard',
  'bitch',
  'dick',
  'cock',
  'shit',
  'fuck',
  'cunt',
  'whore',
  'slut',
  'pussy',
  'penis',
  'vagina',
  'sex',
  'porn',
  'xxx',
  'rape',
  'nazi',
  'hitler',
  'kill',
  'die',
  'murder',
  'suicide',
  'drug',
  'weed',
  'cocaine',
  'heroin',
  'meth',
  // Slurs and hate speech (sanitized versions for matching)
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'spic',
  'chink',
  'kike',
  'tranny',
  // Reserved system terms (handled separately in impersonation check)
  // Note: Gaming slang like 'noob', 'ez', 'rekt' are allowed
  // Users can express themselves with gaming culture terms
];

/**
 * Leetspeak character substitutions
 * Maps leetspeak to normal characters
 */
const LEETSPEAK_MAP = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '+': 't',
  '()': 'o',
  '[]': 'i',
  '{}': 'o',
};

/**
 * Normalize text for comparison
 * Handles leetspeak, special characters, and case normalization
 *
 * NOTE: We normalize leetspeak ONLY for checking against profanity,
 * not for the actual username. Users can freely use leetspeak as long
 * as it doesn't hide inappropriate content.
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';

  let normalized = text.toLowerCase();

  // Remove zero-width characters (unicode U+200B, U+200C, U+200D, U+FEFF)
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Remove underscores and spaces (for matching purposes)
  normalized = normalized.replace(/[_\s-]/g, '');

  // Convert leetspeak to normal characters (for profanity detection only)
  Object.entries(LEETSPEAK_MAP).forEach(([leet, normal]) => {
    // Escape special regex characters in the leetspeak pattern
    const escapedLeet = leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escapedLeet, 'g'), normal);
  });

  // Remove repeated characters (e.g., "shiiiit" -> "shit")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  return normalized;
}

/**
 * Check if text contains any profanity
 * Uses multiple detection strategies:
 * 1. Exact match (after normalization)
 * 2. Substring match (word within username)
 * 3. Pattern detection (repeated characters, etc.)
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if profanity detected
 */
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = normalizeText(text);

  // Check against profanity list
  for (const word of PROFANITY_LIST) {
    const normalizedWord = normalizeText(word);

    // Exact match
    if (normalized === normalizedWord) {
      return true;
    }

    // Contains as substring (with word boundaries)
    // Match if profane word appears as whole word or with separators
    const wordPattern = new RegExp(
      `(^|[^a-z])${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`,
      'i'
    );
    if (wordPattern.test(normalized)) {
      return true;
    }

    // Check if profane word is embedded in the username
    // (e.g., "badwordhere" contains "badword")
    if (normalized.includes(normalizedWord)) {
      // Only flag if it's a significant portion (> 50%) of the username
      // This prevents false positives like "grass" containing "ass"
      const ratio = normalizedWord.length / normalized.length;
      if (ratio > 0.5) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate username for appropriate content
 * This is the main validation function to use
 *
 * @param {string} username - Username to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
export function validateUsernameContent(username) {
  if (!username) {
    return { valid: false, reason: 'Username is required' };
  }

  // Check basic format first (alphanumeric + underscore only)
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return {
      valid: false,
      reason:
        'Username must be 3-20 characters and contain only letters, numbers, and underscores',
    };
  }

  // Check for profanity
  if (containsProfanity(username)) {
    return {
      valid: false,
      reason: 'Username contains inappropriate content. Please choose a different name.',
    };
  }

  // Check for impersonation attempts (reserved words)
  const reservedPrefixes = ['admin', 'mod', 'moderator', 'official', 'staff', 'tandem', 'support'];
  const lowerUsername = username.toLowerCase();

  for (const prefix of reservedPrefixes) {
    if (lowerUsername.startsWith(prefix) || lowerUsername.endsWith(prefix)) {
      return {
        valid: false,
        reason: 'Username cannot impersonate staff or official accounts.',
      };
    }
  }

  // All checks passed
  return { valid: true };
}

/**
 * Sanitize username by removing or replacing inappropriate content
 * Used as a fallback if we want to suggest alternatives
 *
 * @param {string} username - Username to sanitize
 * @returns {string} Sanitized username
 */
export function sanitizeUsername(username) {
  if (!username) return '';

  // Start with basic cleanup
  let sanitized = username.replace(/[^a-zA-Z0-9_]/g, '');

  // If it contains profanity, replace with asterisks (not ideal for UX, better to reject)
  if (containsProfanity(sanitized)) {
    // Replace profane parts with "User" + random number
    const randomNum = Math.floor(Math.random() * 9999);
    sanitized = `User${randomNum}`;
  }

  // Ensure length constraints
  if (sanitized.length < 3) {
    sanitized = sanitized + 'User';
  }
  if (sanitized.length > 20) {
    sanitized = sanitized.substring(0, 20);
  }

  return sanitized;
}

/**
 * Check if username is appropriate for display (client-side quick check)
 * This is a lightweight check for UI purposes
 *
 * @param {string} username - Username to check
 * @returns {boolean} True if appropriate
 */
export function isAppropriateUsername(username) {
  const result = validateUsernameContent(username);
  return result.valid;
}

export default {
  containsProfanity,
  validateUsernameContent,
  sanitizeUsername,
  isAppropriateUsername,
};
