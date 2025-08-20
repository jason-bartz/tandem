import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getPuzzleNumber(startDate = '2025-01-01') {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = Math.abs(today - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getCurrentPuzzleInfo() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  return {
    number: getPuzzleNumber(),
    date: now.toLocaleDateString('en-US', options),
    isoDate: now.toISOString().split('T')[0],
  };
}

export function generateShareText(puzzleNumber, time, mistakes, results) {
  const resultEmojis = results.map(r => r ? '🟣🟠' : '⚪⚪').join('');
  return `Tandem #${puzzleNumber}\n${resultEmojis}\nTime: ${time}\nMistakes: ${mistakes}/4\n\nPlay at tandem.game`;
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
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isValidPuzzle(puzzle) {
  if (!puzzle || typeof puzzle !== 'object') return false;
  if (!puzzle.theme || typeof puzzle.theme !== 'string') return false;
  if (!Array.isArray(puzzle.puzzles) || puzzle.puzzles.length !== 4) return false;
  
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