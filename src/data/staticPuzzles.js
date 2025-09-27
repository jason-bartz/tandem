// Static puzzle data for iOS builds
import augustPuzzles from './puzzles-august-2025.json';

// Combine all puzzle data
const allPuzzles = {
  ...augustPuzzles
};

// Get today's date in YYYY-MM-DD format (Eastern Time)
function getTodayDate() {
  const now = new Date();
  // Convert to Eastern Time
  const etOffset = -5; // EST offset (will need DST handling for production)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const etTime = new Date(utc + (3600000 * etOffset));

  const year = etTime.getFullYear();
  const month = String(etTime.getMonth() + 1).padStart(2, '0');
  const day = String(etTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Get a puzzle for a specific date
export function getStaticPuzzle(date) {
  // If no date provided, use today
  const targetDate = date || getTodayDate();

  // Check if we have a puzzle for this date
  if (allPuzzles[targetDate]) {
    return {
      puzzle: allPuzzles[targetDate],
      date: targetDate,
      success: true
    };
  }

  // Fallback: return the most recent puzzle we have
  const availableDates = Object.keys(allPuzzles).sort();
  const fallbackDate = availableDates[availableDates.length - 1];

  return {
    puzzle: allPuzzles[fallbackDate],
    date: fallbackDate,
    success: true
  };
}

// Get all available puzzle dates
export function getAvailableDates() {
  return Object.keys(allPuzzles).sort();
}

export default allPuzzles;