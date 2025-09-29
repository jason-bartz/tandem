import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getPuzzleNumber(targetDate = null) {
  // Start from the oldest puzzle we have: August 16, 2025
  const start = new Date('2025-08-16');
  const target = targetDate ? new Date(targetDate) : new Date();
  
  // Calculate difference in days
  const diffTime = target - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Puzzle #1 is August 16, 2025
  return diffDays + 1;
}

export function getCurrentPuzzleInfo() {
  // Get current date in ET timezone
  const { toZonedTime } = require('date-fns-tz');
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etNow = toZonedTime(now, etTimeZone);
  
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/New_York'
  };
  
  const isoDate = `${etNow.getFullYear()}-${String(etNow.getMonth() + 1).padStart(2, '0')}-${String(etNow.getDate()).padStart(2, '0')}`;
  
  return {
    number: getPuzzleNumber(isoDate),
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
    day: 'numeric' 
  };
  
  return {
    number: getPuzzleNumber(date),
    date: d.toLocaleDateString('en-US', options),
    isoDate: date,
  };
}

export function formatDateShort(dateString) {
  // Convert date string to M/D/YY format
  const date = new Date(dateString + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

export function generateShareText(puzzleDate, theme, timeInSeconds, mistakes, hintsUsed = 0, hintPositions = []) {
  // Format time as M:SS
  const formattedTime = formatTime(timeInSeconds);
  const formattedDate = formatDateShort(puzzleDate);
  
  // Build the header
  let shareText = `Daily Puzzle ${formattedDate}\n`;
  shareText += `${theme}\n`;
  shareText += `━━━━━━━━━━━━\n`;
  
  // Build the stats line
  shareText += `⏱️ ${formattedTime} | ❌ ${mistakes}/4`;
  shareText += `\n\n`;
  
  // Build emoji representation of puzzle completion
  // 4 puzzles, each represented by 🔷 or 💡 (if hint was used on that position)
  const puzzleEmojis = [];
  for (let i = 0; i < 4; i++) {
    if (hintPositions.includes(i)) {
      puzzleEmojis.push('💡');
    } else {
      puzzleEmojis.push('🔷');
    }
  }
  shareText += puzzleEmojis.join(' ');
  
  shareText += '\n\n#TandemPuzzle';
  
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
  if (typeof window === 'undefined') {return false;}
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isValidPuzzle(puzzle) {
  if (!puzzle || typeof puzzle !== 'object') {return false;}
  if (!puzzle.theme || typeof puzzle.theme !== 'string') {return false;}
  if (!Array.isArray(puzzle.puzzles) || puzzle.puzzles.length !== 4) {return false;}
  
  return puzzle.puzzles.every(p => 
    p.emoji && 
    typeof p.emoji === 'string' && 
    p.answer && 
    typeof p.answer === 'string'
  );
}

export function sanitizeInput(input) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '');
}

export function checkAnswerWithPlurals(userAnswer, correctAnswer) {
  const user = userAnswer.trim().toUpperCase();
  
  // Split correct answer by comma to handle multiple acceptable answers
  const acceptableAnswers = correctAnswer.split(',').map(ans => ans.trim().toUpperCase());
  
  // Check each acceptable answer
  for (const correct of acceptableAnswers) {
    // Exact match
    if (user === correct) {return true;}
    
    // Check if user answer is the plural of correct answer
    if (user === correct + 'S') {return true;}
    if (user === correct + 'ES') {return true;}
    
    // Check if correct answer is the plural of user answer
    if (correct === user + 'S') {return true;}
    if (correct === user + 'ES') {return true;}
    
    // Handle special cases for words ending in Y (e.g., PIRACY -> PIRACIES)
    if (correct.endsWith('Y') && user === correct.slice(0, -1) + 'IES') {return true;}
    if (user.endsWith('Y') && correct === user.slice(0, -1) + 'IES') {return true;}
    
    // Handle words ending in F/FE (e.g., THIEF -> THIEVES, KNIFE -> KNIVES)
    if (correct.endsWith('F') && user === correct.slice(0, -1) + 'VES') {return true;}
    if (correct.endsWith('FE') && user === correct.slice(0, -2) + 'VES') {return true;}
    if (user.endsWith('F') && correct === user.slice(0, -1) + 'VES') {return true;}
    if (user.endsWith('FE') && correct === user.slice(0, -2) + 'VES') {return true;}
  }
  
  return false;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function getRandomCongratulation() {
  const congratulations = [
    'Brilliant!',
    'Excellent!',
    'Fantastic!',
    'Amazing!',
    'Wonderful!',
    'Superb!',
    'Stellar!',
    'Awesome!',
    'Terrific!',
    'Way to go!',
    'You did it!',
    'Well done!',
    'Nice work!',
    'Great job!',
    'Hooray!',
    'Bravo!',
    'Victory!',
    'Marvelous!',
    'Splendid!',
    'Outstanding!',
    'Incredible!',
    'Remarkable!',
    'Congratulations!',
    'Congrats!'
  ];
  
  return congratulations[Math.floor(Math.random() * congratulations.length)];
}