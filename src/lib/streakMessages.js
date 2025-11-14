/**
 * streakMessages.js
 *
 * Random motivational messages for streak displays.
 * Each puzzle gets a different random message to keep things fresh.
 */

const STREAK_MESSAGES = [
  "{streak} days strong! Keep it going!",
  "Don't break that {streak} day streak now!",
  "{streak} days in a row? Impressive!",
  "{streak} day streak and counting...",
  "You're on fire! {streak} days straight!",
  "{streak} consecutive days - unstoppable!",
  "Nice! {streak} days of dedication!",
  "{streak} days down, many more to go!",
  "Crushing it for {streak} days now!",
  "{streak} day streak? You're a legend!",
  "{streak} days of pure consistency!",
  "Look at you go! {streak} days strong!",
  "{streak} days - that's commitment!",
  "Keep that {streak} day flame burning!",
  "{streak} glorious days in a row!",
  "{streak} days of excellence!",
  "What a run! {streak} days and counting!",
  "{streak} days of determination!",
  "Wow! {streak} consecutive days!",
  "{streak} days - you're unstoppable!"
];

/**
 * Gets a random streak message for display
 * Ensures each puzzle type gets a different message by using a seed
 *
 * @param {number} streak - The current streak count
 * @param {string} puzzleType - Type of puzzle ('tandem', 'cryptic', 'mini')
 * @returns {string} The formatted streak message
 */
export function getStreakMessage(streak, puzzleType = 'tandem') {
  // Use puzzle type and current date as seed to ensure different messages per puzzle
  // but consistent messages throughout the day
  const today = new Date().toDateString();
  const seed = `${puzzleType}-${today}`;

  // Simple hash function to get deterministic "random" index
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % STREAK_MESSAGES.length;
  const message = STREAK_MESSAGES[index];

  // Replace {streak} placeholder with actual streak number
  return message.replace('{streak}', streak);
}

export default getStreakMessage;
