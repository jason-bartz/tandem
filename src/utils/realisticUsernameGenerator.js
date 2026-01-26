import realisticUsernameDatabase from '@/data/realisticUsernameDatabase.json';
import simpleUsernameDatabase from '@/data/usernameDatabase.json';

/**
 * Pick a random item from an array
 * @param {Array} arr - Array to pick from
 * @returns {*} Random item
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a simple two-part username from the simple database
 * Format: Descriptor + Noun (e.g., "CleverSolver", "CrypticGenius")
 * @returns {string} Simple two-part username
 */
function generateSimpleTwoPartUsername() {
  const firstPart = randomPick(simpleUsernameDatabase.firstParts);
  const secondPart = randomPick(simpleUsernameDatabase.secondParts);
  return firstPart + secondPart;
}

/**
 * Get a random first part (name or descriptor)
 * Names are more common than descriptors (70/30 split)
 * @returns {string} First part
 */
function getFirstPart() {
  const { names, descriptors } = realisticUsernameDatabase.firstParts;
  // 70% chance of name, 30% chance of descriptor
  if (Math.random() < 0.7) {
    return randomPick(names);
  }
  return randomPick(descriptors);
}

/**
 * Get a random second part (letter or word)
 * Letters are less common than words (30/70 split)
 * @returns {string} Second part
 */
function getSecondPart() {
  const { letters, words } = realisticUsernameDatabase.secondParts;
  // 30% chance of letter, 70% chance of word
  if (Math.random() < 0.3) {
    return randomPick(letters);
  }
  return randomPick(words);
}

/**
 * Get a random third part (number or year)
 * Years are slightly less common than regular numbers (40/60 split)
 * @returns {string} Third part
 */
function getThirdPart() {
  const { numbers, years } = realisticUsernameDatabase.thirdParts;
  // 60% chance of number, 40% chance of year
  if (Math.random() < 0.6) {
    return randomPick(numbers);
  }
  return randomPick(years);
}

/**
 * Get a random delimiter (most often empty)
 * @returns {string} Delimiter
 */
function getDelimiter() {
  return randomPick(realisticUsernameDatabase.delimiters);
}

/**
 * Generate a realistic username that looks like a real person would create
 *
 * Possible patterns:
 * - Simple two-part (25%): "CleverSolver", "CrypticGenius" (from simple database)
 * - 1 only (name/descriptor): "Ashley", "MightyMike"
 * - 2 only (word/letter): "Phoenix", "Gamer"
 * - 1+2: "AshleyK", "Mike_Dragon", "BigBoss"
 * - 1+3: "Ashley92", "Mike1985"
 * - 2+3: "Phoenix99", "Gamer_2000"
 * - 1+2+3: "AshleyK92", "Mike_Dragon_85"
 *
 * Never: 3 only (just numbers)
 *
 * @returns {string} Generated username
 */
export function generateRealisticUsername() {
  // 25% chance to use simple two-part format for variety
  if (Math.random() < 0.25) {
    return generateSimpleTwoPartUsername();
  }

  // Define pattern probabilities (weighted to create realistic distribution)
  // Pattern format: [has1, has2, has3]
  const patterns = [
    { pattern: [true, false, false], weight: 15 }, // 1 only: "Ashley"
    { pattern: [false, true, false], weight: 10 }, // 2 only: "Phoenix"
    { pattern: [true, true, false], weight: 25 }, // 1+2: "AshleyK", "MikeDragon"
    { pattern: [true, false, true], weight: 20 }, // 1+3: "Ashley92"
    { pattern: [false, true, true], weight: 10 }, // 2+3: "Phoenix99"
    { pattern: [true, true, true], weight: 20 }, // 1+2+3: "AshleyK92"
  ];

  // Calculate total weight
  const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);

  // Pick a pattern based on weights
  let random = Math.random() * totalWeight;
  let selectedPattern = patterns[0].pattern;
  for (const p of patterns) {
    random -= p.weight;
    if (random <= 0) {
      selectedPattern = p.pattern;
      break;
    }
  }

  const [has1, has2, has3] = selectedPattern;

  // Build username parts
  const parts = [];
  const delimiters = [];

  if (has1) {
    parts.push(getFirstPart());
  }

  if (has2) {
    if (parts.length > 0) {
      delimiters.push(getDelimiter());
    }
    parts.push(getSecondPart());
  }

  if (has3) {
    if (parts.length > 0) {
      // Numbers often have no delimiter or underscore
      const numDelimiter = Math.random() < 0.7 ? '' : randomPick(['_', '']);
      delimiters.push(numDelimiter);
    }
    parts.push(getThirdPart());
  }

  // Combine parts with delimiters
  let username = parts[0];
  for (let i = 1; i < parts.length; i++) {
    username += (delimiters[i - 1] || '') + parts[i];
  }

  return username;
}

/**
 * Generate multiple unique realistic usernames
 *
 * @param {number} count - Number of usernames to generate
 * @returns {string[]} Array of unique usernames
 */
export function generateMultipleRealisticUsernames(count = 5) {
  const usernames = new Set();

  // Keep generating until we have the desired count
  while (usernames.size < count) {
    usernames.add(generateRealisticUsername());
  }

  return Array.from(usernames);
}
