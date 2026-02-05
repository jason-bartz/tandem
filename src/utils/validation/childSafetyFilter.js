/**
 * Child Safety Filter for AI-Generated Content
 *
 * This filter is ALWAYS active regardless of adult content settings.
 * Child exploitation content is never acceptable under any circumstances.
 *
 * Used primarily by Daily Alchemy element generation to prevent
 * the creation of elements that could reference CSAM or child exploitation.
 */

/**
 * Terms that, when combined with child-related words, indicate unsafe content
 * These are only flagged when they appear alongside child-related terms
 */
const EXPLOITATION_TERMS = [
  'sex',
  'porn',
  'xxx',
  'nude',
  'naked',
  'erotic',
  'fetish',
  'rape',
  'molest',
  'abuse',
  'exploit',
  'trafficking',
  'grooming',
  'predator',
  'pedo',
  'loli',
  'shota',
  'hentai',
  'lewd',
  'nsfw',
  'intimate',
  'seduc',
  'touch',
];

/**
 * Child-related terms that trigger pattern matching
 */
const CHILD_TERMS = [
  'child',
  'children',
  'kid',
  'kids',
  'minor',
  'minors',
  'underage',
  'teen',
  'teens',
  'teenage',
  'teenager',
  'preteen',
  'toddler',
  'infant',
  'baby',
  'babies',
  'youth',
  'juvenile',
  'boy',
  'girl',
  'schoolgirl',
  'schoolboy',
  'loli',
  'shota',
  'jailbait',
];

/**
 * Direct blocklist - these terms are blocked regardless of context
 */
const DIRECT_BLOCKLIST = [
  'cp',
  'csam',
  'pedo',
  'pedophile',
  'pedophilia',
  'lolicon',
  'shotacon',
  'jailbait',
  'childporn',
  'kiddieporn',
  'childlove',
  'childlover',
  'pizzagate',
  'cheese pizza',
];

/**
 * Normalize text for comparison
 * @param {string} text - Text to normalize
 * @returns {string} Normalized lowercase text
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\s_\-\.]/g, '') // Remove spaces, underscores, hyphens, dots
    .replace(/[0-9]/g, (d) => {
      // Convert leetspeak numbers
      const map = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' };
      return map[d] || d;
    });
}

/**
 * Check if text contains child exploitation patterns
 * Returns true if content should be blocked
 *
 * @param {string} text - Text to check (element name, etc.)
 * @returns {boolean} True if content is unsafe and should be blocked
 */
export function containsChildExploitationContent(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = normalizeText(text);
  const original = text.toLowerCase();

  // Check direct blocklist first
  for (const term of DIRECT_BLOCKLIST) {
    const normalizedTerm = normalizeText(term);
    if (normalized.includes(normalizedTerm)) {
      return true;
    }
  }

  // Check for child terms + exploitation terms combination
  const hasChildTerm = CHILD_TERMS.some((term) => {
    const normalizedTerm = normalizeText(term);
    return normalized.includes(normalizedTerm) || original.includes(term);
  });

  if (hasChildTerm) {
    const hasExploitationTerm = EXPLOITATION_TERMS.some((term) => {
      const normalizedTerm = normalizeText(term);
      return normalized.includes(normalizedTerm) || original.includes(term);
    });

    if (hasExploitationTerm) {
      return true;
    }
  }

  return false;
}

/**
 * Get a safe fallback element when unsafe content is blocked
 * Returns a random neutral element name and emoji
 *
 * @returns {{element: string, emoji: string}} Safe fallback element
 */
export function getSafeFallbackElement() {
  const fallbacks = [
    { element: 'Mystery', emoji: '❓' },
    { element: 'Void', emoji: '🕳️' },
    { element: 'Null', emoji: '⬛' },
    { element: 'Nothing', emoji: '💨' },
    { element: 'Paradox', emoji: '🔄' },
    { element: 'Error', emoji: '⚠️' },
    { element: 'Antimatter', emoji: '✨' },
    { element: 'Impossibility', emoji: '🚫' },
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Validate and sanitize element combination result
 * This is the main function to use for AI-generated element validation
 *
 * @param {string} element - Element name to validate
 * @param {string} emoji - Element emoji
 * @returns {{element: string, emoji: string, blocked: boolean}} Validated result
 */
export function validateElementSafety(element, emoji) {
  if (containsChildExploitationContent(element)) {
    const fallback = getSafeFallbackElement();
    return {
      element: fallback.element,
      emoji: fallback.emoji,
      blocked: true,
    };
  }

  return {
    element,
    emoji,
    blocked: false,
  };
}

export default {
  containsChildExploitationContent,
  getSafeFallbackElement,
  validateElementSafety,
};
