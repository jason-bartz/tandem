/**
 * Professional Profanity Filter
 *
 * Industry-standard content moderation system for usernames.
 * Implements multiple detection techniques to prevent inappropriate content
 * from appearing on leaderboards and public profiles.
 *
 * Features:
 * - Multi-pattern detection (exact, leetspeak, obfuscation)
 * - Homoglyph/Unicode lookalike detection
 * - Context-aware filtering to minimize false positives
 * - Apple HIG compliant error messages
 * - Comprehensive profanity database
 *
 * @module profanityFilter
 */

/**
 * Character substitution map for leetspeak detection
 * Maps common letter substitutions back to their original characters
 */
const LEET_SPEAK_MAP = {
  0: 'o',
  1: 'i',
  3: 'e',
  4: 'a',
  5: 's',
  7: 't',
  8: 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
  '+': 't',
  '|': 'i',
  '(': 'c',
  '<': 'c',
  '>': 'c',
  '[': 'c',
  '{': 'c',
};

/**
 * Homoglyph map for Unicode lookalike detection
 * Maps visually similar characters to their ASCII equivalents
 */
const HOMOGLYPH_MAP = {
  // Cyrillic lookalikes
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
  // Greek lookalikes
  α: 'a',
  β: 'b',
  γ: 'y',
  ε: 'e',
  ο: 'o',
  ρ: 'p',
  ν: 'v',
  Α: 'A',
  Β: 'B',
  Ε: 'E',
  Ζ: 'Z',
  Η: 'H',
  Ι: 'I',
  Κ: 'K',
  Μ: 'M',
  Ν: 'N',
  Ο: 'O',
  Ρ: 'P',
  Τ: 'T',
  Υ: 'Y',
  Χ: 'X',
  // Other Unicode lookalikes
  ⅰ: 'i',
  ⅱ: 'ii',
  ⅲ: 'iii',
  ⅳ: 'iv',
  ⅴ: 'v',
  İ: 'I',
  ı: 'i',
  Ł: 'L',
  ł: 'l',
  Ø: 'O',
  ø: 'o',
  '¡': 'i',
  '£': 'E',
  '¥': 'Y',
  '§': 'S',
};

/**
 * Comprehensive profanity word list
 *
 * This list includes:
 * - Strong profanity and slurs
 * - Sexual/explicit terms
 * - Hate speech and discriminatory terms
 * - Drug references (context-dependent)
 * - Violence/threats
 * - Scam/spam patterns
 *
 * Note: This is a professional moderation list. Words are included to protect
 * users and maintain a family-friendly environment, not to be offensive.
 */
const PROFANITY_LIST = [
  // Strong profanity (English)
  'fuck',
  'shit',
  'ass',
  'bitch',
  'damn',
  'crap',
  'piss',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'bastard',
  'slut',
  'whore',
  'fag',
  'dyke',
  'homo',
  'retard',
  'nigger',
  'nigga',
  'chink',
  'spic',
  'wetback',
  'kike',
  'gook',
  'jap',
  'wop',
  'beaner',
  'cracker',
  'honkey',
  'towelhead',

  // Variations and compound words
  'asshole',
  'asswipe',
  'dumbass',
  'jackass',
  'bullshit',
  'horseshit',
  'dipshit',
  'shithead',
  'shitface',
  'fuckface',
  'motherfucker',
  'fucker',
  'fucking',
  'fucked',
  'dickhead',
  'dickface',
  'cocksucker',
  'cuntface',
  'bitchass',
  'douchebag',
  'douche',
  'prick',
  'twat',

  // Sexual/explicit terms
  'penis',
  'vagina',
  'testicle',
  'scrotum',
  'anal',
  'anus',
  'rectum',
  'cumshot',
  'cumming',
  'orgasm',
  'masturbate',
  'jerkoff',
  'blowjob',
  'handjob',
  'footjob',
  'rimjob',
  'titjob',
  'boob',
  'tit',
  'nipple',
  'porn',
  'porno',
  'pornography',
  'xxx',
  'nsfw',
  'milf',
  'dilf',
  'hentai',
  'rape',
  'molest',
  'pedophile',
  'pedo',
  'loli',
  'shota',

  // Slurs and hate speech
  'nazi',
  'hitler',
  'genocide',
  'kkk',
  'terrorist',
  'jihadist',
  'supremacist',
  'rapist',
  'sexist',
  'bigot',

  // Drug references (common abuse terms)
  'cocaine',
  'heroin',
  'meth',
  'crack',
  'weed',
  'marijuana',
  'cannabis',
  'mdma',
  'ecstasy',
  'lsd',
  'shrooms',
  'xanax',
  'oxy',
  'fentanyl',
  'drugdealer',
  'dealer',
  'junkie',
  'addict',
  'crackhead',
  'pothead',
  'stoner',
  'tweaker',
  'methhead',

  // Violence/threats
  'kill',
  'murder',
  'rape',
  'torture',
  'mutilate',
  'dismember',
  'assassin',
  'hitman',
  'terrorist',
  'bomber',
  'shooter',
  'killer',
  'suicide',
  'kys',
  'killurself',
  'killyourself',
  'dieslowly',

  // Scam/spam indicators (common fraud patterns)
  'bitcoin',
  'crypto',
  'winner',
  'prize',
  'congratulations',
  'cashapp',
  'venmo',
  'paypal',
  'giveaway',

  // Common obfuscation attempts (partial)
  'fuk',
  'fck',
  'sht',
  'btch',
  'cnt',
  'dck',
  'psy',
  'fgt',
  'ngr',
  'nggr',
  'fvck',
  'phuck',
  'phuk',
  'shyt',
  'biatch',
  'beatch',
  'beyotch',

  // Additional inappropriate terms
  'sex',
  'sexy',
  'sexxx',
  'horny',
  'nude',
  'naked',
  'stripper',
  'escort',
  'hooker',
  'prostitute',
  'pimp',
  'thot',
  'sluttty',
  'whoring',
  'hoe',
  'hoes',
  'booty',
  'bootylicious',
  'thicc',
  'daddy',
  'zaddy',
  'buttsex',
  'analsex',
  'oralsex',
  'sexbot',
  'sexgod',
  'sexytime',

  // Offensive gestures and actions
  'handjob',
  'fingerblast',
  'fisting',
  'sixtynine',
  '69',

  // Internet slang (inappropriate)
  'af',
  'wtf',
  'stfu',
  'gtfo',
  'milf',
  'dilf',
  'gilf',
  'pawg',
  'bbw',
  'bbc',
  'bwc',
  'nsfw',
  'r34',
  'rule34',
  'onlyfans',
  'simp',
  'incel',

  // Discriminatory terms (additional)
  'tranny',
  'shemale',
  'ladyboy',
  'hermaphrodite',
  'midget',
  'dwarf',
  'cripple',
  'gimp',
  'spaz',
  'mongoloid',
  'autist',
  'autistic',

  // Religious offense
  'goddamn',
  'godforsaken',
  'christkiller',
  'islamist',
  'infidel',

  // Bodily functions (excessive)
  'poop',
  'pee',
  'fart',
  'burp',
  'vomit',
  'puke',
  'diarrhea',
  'turd',
  'semen',
  'sperm',
  'jizz',
  'cum',
  'ejaculate',
  'menstruation',
  'period',

  // Combinations and creative spellings
  'mofo',
  'soab',
  'pos',
  'sob',
  'moron',
  'idiot',
  'imbecile',
  'stupid',
  'dumb',
  'loser',
  'failure',
  'worthless',
  'pathetic',
  'useless',
];

/**
 * Allowed words that might trigger false positives
 * These are legitimate words that contain substring matches with profanity
 * but are acceptable in context
 */
const WHITELIST = [
  'assassin', // Historical term
  'classic', // Contains 'ass'
  'compass', // Contains 'ass'
  'passover', // Contains 'ass'
  'password', // Contains 'ass'
  'bass', // Musical instrument
  'glass', // Common word
  'class', // Common word
  'mass', // Common word
  'grass', // Common word
  'brass', // Common word
  'passed', // Common word
  'passing', // Common word
  'passenger', // Common word
  'associate', // Common word
  'cassette', // Common word
  'assemble', // Common word (assembly)
  'assistance', // Common word
  'assistant', // Common word
  'cockatoo', // Bird species
  'peacock', // Bird species
  'hancock', // Name
  'dickens', // Name (Charles Dickens)
  'dickinson', // Name
  'sussex', // Place name
  'essex', // Place name
  'middlesex', // Place name
  'scunthorpe', // Town in England (Scunthorpe problem)
  'penistone', // Town in England
  'lightwater', // Contains 'twat'
  'assignment', // Common word
  'sassafras', // Common word/plant
  'assassin', // Already in list but keeping for clarity
];

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize text by converting leetspeak and homoglyphs to standard characters
 * @param {string} text - Input text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  let normalized = text.toLowerCase().trim();

  // Replace homoglyphs
  for (const [homoglyph, ascii] of Object.entries(HOMOGLYPH_MAP)) {
    const escapedHomoglyph = escapeRegex(homoglyph);
    normalized = normalized.replace(new RegExp(escapedHomoglyph, 'g'), ascii);
  }

  // Replace leetspeak
  for (const [leet, ascii] of Object.entries(LEET_SPEAK_MAP)) {
    const escapedLeet = escapeRegex(leet);
    normalized = normalized.replace(new RegExp(escapedLeet, 'g'), ascii);
  }

  return normalized;
}

/**
 * Remove common obfuscation techniques
 * - Repeated characters (e.g., 'fuuuuck' -> 'fuck')
 * - Spaces between letters (e.g., 'f u c k' -> 'fuck')
 * - Special characters between letters (e.g., 'f-u-c-k' -> 'fuck')
 * @param {string} text - Input text
 * @returns {string} Deobfuscated text
 */
function deobfuscate(text) {
  if (!text) return '';

  let deobfuscated = text;

  // Remove spaces between single characters
  deobfuscated = deobfuscated.replace(/([a-z])\s+([a-z])/gi, '$1$2');

  // Remove special characters between letters (iteratively to handle chains)
  for (let i = 0; i < 5; i++) {
    deobfuscated = deobfuscated.replace(/([a-z])[^a-z0-9]+([a-z])/gi, '$1$2');
  }

  // Remove repeated characters (keep max 1, but try both 1 and 2 for checking)
  deobfuscated = deobfuscated.replace(/(.)\1+/g, '$1');

  return deobfuscated;
}

/**
 * Check if a word is in the whitelist (case-insensitive exact match)
 * @param {string} word - Word to check
 * @returns {boolean} True if word is whitelisted
 */
function isWhitelisted(word) {
  const normalized = word.toLowerCase().trim();
  return WHITELIST.includes(normalized);
}

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {boolean} True if profanity detected
 */
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;

  // Check whitelist first (exact match)
  if (isWhitelisted(text)) {
    return false;
  }

  // Normalize and deobfuscate
  const normalized = normalizeText(text);
  const deobfuscated = deobfuscate(normalized);

  // Create versions to check
  const versionsToCheck = [text.toLowerCase(), normalized, deobfuscated];

  // Special list of 3-char words that should be detected as substrings
  // These are clearly inappropriate and unlikely to cause false positives
  const shortWordSubstringCheck = ['sex', 'ass', 'kys', 'cum', 'xxx', 'gay'];

  // Check against profanity list
  for (const profaneWord of PROFANITY_LIST) {
    for (const version of versionsToCheck) {
      // Exact word match (with word boundaries)
      const wordBoundaryRegex = new RegExp(`\\b${profaneWord}\\b`, 'i');
      if (wordBoundaryRegex.test(version)) {
        return true;
      }

      // Substring match for specific 3-char words
      if (shortWordSubstringCheck.includes(profaneWord) && version.includes(profaneWord)) {
        // Don't match common legitimate words containing 'ass'
        const legitWordsWithAss = [
          'assess',
          'asset',
          'assent',
          'bass',
          'brass',
          'class',
          'compass',
          'crass',
          'glass',
          'grass',
          'harass',
          'mass',
          'pass',
          'trespass',
          'sussex',
          'essex',
          'embassy',
          'assemble',
          'assignment',
          'sassafras',
          'assassin',
          'assistance',
          'assistant',
          'cassette',
          'basketball',
          'passenger',
          'massage',
          'passage',
        ];
        const isLegit = legitWordsWithAss.some((word) => version.includes(word.toLowerCase()));
        if (!isLegit && !isWhitelisted(text)) {
          return true;
        }
      }

      // Substring match (for embedded profanity)

      if (profaneWord.length >= 4 && version.includes(profaneWord)) {
        // Double-check it's not a whitelisted word
        if (!isWhitelisted(text)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Validate username for profanity and format
 * Returns validation result with user-friendly error message
 *
 * @param {string} username - Username to validate
 * @returns {Object} Validation result: { valid: boolean, error?: string }
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return {
      valid: false,
      error: 'Username is required',
    };
  }

  const trimmed = username.trim();

  // Length validation
  if (trimmed.length < 3) {
    return {
      valid: false,
      error: 'Username must be at least 3 characters long',
    };
  }

  if (trimmed.length > 20) {
    return {
      valid: false,
      error: 'Username must be 20 characters or less',
    };
  }

  // Format validation (alphanumeric + underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }

  // Profanity check
  if (containsProfanity(trimmed)) {
    return {
      valid: false,
      error: 'This username is not appropriate. Please choose a different one.',
    };
  }

  // Reserved system usernames
  const reservedUsernames = [
    'admin',
    'administrator',
    'mod',
    'moderator',
    'support',
    'help',
    'official',
    'staff',
    'team',
    'tandem',
    'system',
    'bot',
    'robot',
    'user',
    'guest',
    'anonymous',
    'deleted',
    'removed',
    'banned',
    'root',
    'superuser',
    'owner',
    'manager',
  ];

  if (reservedUsernames.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: 'This username is reserved. Please choose a different one.',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Get a safe error message for profanity detection
 * Never reveals the specific word that triggered the filter (Apple HIG best practice)
 *
 * @returns {string} User-friendly error message
 */
export function getProfanityErrorMessage() {
  return 'This username is not appropriate. Please choose a different one.';
}

/**
 * Server-side validation wrapper for API routes
 * Provides consistent validation across client and server
 *
 * @param {string} username - Username to validate
 * @returns {Object} Validation result with HTTP-friendly format
 */
export function validateUsernameForAPI(username) {
  const result = validateUsername(username);

  if (!result.valid) {
    return {
      success: false,
      error: result.error,
      statusCode: 400,
    };
  }

  return {
    success: true,
  };
}

/**
 * Test function for debugging (not exported in production)
 * @param {string} text - Text to test
 * @returns {Object} Debug information
 */
export function debugProfanityCheck(text) {
  const normalized = normalizeText(text);
  const deobfuscated = deobfuscate(normalized);
  const hasProfanity = containsProfanity(text);

  return {
    original: text,
    normalized,
    deobfuscated,
    hasProfanity,
    isWhitelisted: isWhitelisted(text),
  };
}

export default {
  containsProfanity,
  validateUsername,
  validateUsernameForAPI,
  getProfanityErrorMessage,
  debugProfanityCheck,
};
