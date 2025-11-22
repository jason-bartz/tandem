import { clsx } from 'clsx';
import { getCurrentPuzzleNumber } from './puzzleNumber';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getPuzzleNumber(targetDate = null) {
  // Start from the oldest puzzle we have: August 15, 2025
  const start = new Date('2025-08-15');
  const target = targetDate ? new Date(targetDate) : new Date();

  const diffTime = target - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Puzzle #1 is August 15, 2025
  return diffDays + 1;
}

export function getCurrentPuzzleInfo() {
  // This ensures puzzles change at midnight in the user's timezone, not at a fixed time
  const now = new Date();

  // Get local date at midnight
  const localDate = new Date(now);
  localDate.setHours(0, 0, 0, 0);

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  // Format as ISO date string in local timezone
  const isoDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

  return {
    number: getCurrentPuzzleNumber(), // Use canonical puzzle number calculation
    date: now.toLocaleDateString('en-US', options),
    isoDate: isoDate,
  };
}

export function getPuzzleInfoForDate(date) {
  const d = new Date(date);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return {
    number: getPuzzleNumber(date),
    date: d.toLocaleDateString('en-US', options),
    isoDate: date,
  };
}

export function formatDateShort(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

export function generateShareText(
  puzzleDate,
  theme,
  timeInSeconds,
  mistakes,
  _hintsUsed = 0,
  hintPositions = [],
  solved = 0,
  isHardMode = false,
  hardModeTimeUp = false,
  difficultyRating = null
) {
  const formattedTime = formatTime(timeInSeconds);
  const puzzleNumber = getPuzzleNumber(puzzleDate);

  let shareText = `Daily Tandem #${puzzleNumber}\n`;

  if (isHardMode) {
    if (hardModeTimeUp) {
      shareText += `🔥 HARD MODE - Time's Up!\n`;
    } else {
      shareText += `🔥 HARD MODE\n`;
    }
  }

  if (solved === 4) {
    shareText += `🔍 Theme Discovered!\n`;
  } else {
    shareText += `❓ Theme Hidden\n`;
  }

  if (difficultyRating) {
    shareText += `⭐ Difficulty: ${difficultyRating}\n`;
  }

  shareText += `⏱️ ${formattedTime}`;
  if (isHardMode) {
    shareText += '/2:00';
  }
  shareText += ` | ❌ ${mistakes}/4`;
  shareText += `\n\n`;

  const puzzleEmojis = [];

  for (let i = 0; i < 4; i++) {
    if (i < solved) {
      const hasHint = hintPositions.includes(i);

      if (hasHint) {
        puzzleEmojis.push('💡');
      } else if (isHardMode && solved === 4) {
        puzzleEmojis.push('🔥');
      } else {
        puzzleEmojis.push('🔷');
      }
    } else {
      puzzleEmojis.push('⬜');
    }
  }

  shareText += puzzleEmojis.join('');

  return shareText;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function isMobile() {
  if (typeof window === 'undefined') {
    return false;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isValidPuzzle(puzzle) {
  if (!puzzle || typeof puzzle !== 'object') {
    return false;
  }
  if (!puzzle.theme || typeof puzzle.theme !== 'string') {
    return false;
  }
  if (!Array.isArray(puzzle.puzzles) || puzzle.puzzles.length !== 4) {
    return false;
  }

  return puzzle.puzzles.every((p) => {
    // Required fields
    if (!p.emoji || typeof p.emoji !== 'string') return false;
    if (!p.answer || typeof p.answer !== 'string') return false;

    // Optional hint field - if present, must be string and <= 60 chars
    if (p.hint !== undefined) {
      if (typeof p.hint !== 'string') return false;
      if (p.hint.length > 60) return false;
    }

    return true;
  });
}

export function sanitizeInput(input) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '');
}

export function sanitizeInputPreserveSpaces(input) {
  return input.toUpperCase().replace(/[^A-Z\s]/g, '');
}

export function checkAnswerWithPlurals(userAnswer, correctAnswer) {
  const user = userAnswer.trim().toUpperCase();

  // Split correct answer by comma to handle multiple acceptable answers
  const acceptableAnswers = correctAnswer.split(',').map((ans) => ans.trim().toUpperCase());

  // Check each acceptable answer
  for (const correct of acceptableAnswers) {
    // Exact match
    if (user === correct) {
      return true;
    }

    if (user === correct + 'S') {
      return true;
    }
    if (user === correct + 'ES') {
      return true;
    }

    if (correct === user + 'S') {
      return true;
    }
    if (correct === user + 'ES') {
      return true;
    }

    if (correct.endsWith('Y') && user === correct.slice(0, -1) + 'IES') {
      return true;
    }
    if (user.endsWith('Y') && correct === user.slice(0, -1) + 'IES') {
      return true;
    }

    if (correct.endsWith('F') && user === correct.slice(0, -1) + 'VES') {
      return true;
    }
    if (correct.endsWith('FE') && user === correct.slice(0, -2) + 'VES') {
      return true;
    }
    if (user.endsWith('F') && correct === user.slice(0, -1) + 'VES') {
      return true;
    }
    if (user.endsWith('FE') && correct === user.slice(0, -2) + 'VES') {
      return true;
    }
  }

  return false;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function formatDate(date, format = 'short') {
  const d = new Date(date);

  if (format === 'short') {
    return d.toLocaleDateString();
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return d.toISOString().split('T')[0];
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function getRandomCongratulation() {
  const congratulations = [
    'Brilliant',
    'Excellent',
    'Fantastic',
    'Amazing',
    'Wonderful',
    'Superb',
    'Stellar',
    'Awesome',
    'Terrific',
    'Way to go',
    'You did it',
    'Well done',
    'Nice work',
    'Great job',
    'Hooray',
    'Bravo',
    'Victory',
    'Marvelous',
    'Splendid',
    'Outstanding',
    'Incredible',
    'Remarkable',
    'Congratulations',
    'Congrats',
  ];

  return congratulations[Math.floor(Math.random() * congratulations.length)];
}

export function getCorrectPositions(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) {
    return null;
  }

  const user = userAnswer.trim().toUpperCase();
  const acceptableAnswers = correctAnswer.split(',').map((ans) => ans.trim().toUpperCase());

  let bestMatches = null;
  let maxMatches = 0;

  for (const correct of acceptableAnswers) {
    const matches = {};
    let matchCount = 0;

    const minLength = Math.min(user.length, correct.length);
    for (let i = 0; i < minLength; i++) {
      if (user[i] === correct[i] && user[i] !== ' ') {
        matches[i] = user[i];
        matchCount++;
      }
    }

    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestMatches = matches;
    }
  }

  return maxMatches > 0 ? bestMatches : null;
}
