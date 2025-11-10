import usernameDatabase from '@/data/usernameDatabase.json';

/**
 * Generates a random username by combining a random first part and second part
 * from the username database.
 *
 * @returns {string} A randomly generated username (e.g., "CleverSolver", "MysticOwl")
 */
export function generateRandomUsername() {
  const { firstParts, secondParts } = usernameDatabase;

  // Get random indices
  const randomFirstIndex = Math.floor(Math.random() * firstParts.length);
  const randomSecondIndex = Math.floor(Math.random() * secondParts.length);

  // Combine random parts
  const username = firstParts[randomFirstIndex] + secondParts[randomSecondIndex];

  return username;
}

/**
 * Generates multiple unique random usernames
 *
 * @param {number} count - Number of usernames to generate
 * @returns {string[]} Array of unique random usernames
 */
export function generateMultipleUsernames(count = 5) {
  const usernames = new Set();

  // Keep generating until we have the desired count
  while (usernames.size < count) {
    usernames.add(generateRandomUsername());
  }

  return Array.from(usernames);
}
