import { STORAGE_KEYS } from './constants';

export function loadStats() {
  if (typeof window === 'undefined') {
    return { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };
  }
  
  const stats = localStorage.getItem(STORAGE_KEYS.STATS);
  return stats ? JSON.parse(stats) : { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };
}

export function saveStats(stats) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }
}

export function updateGameStats(won) {
  const stats = loadStats();
  stats.played++;
  
  if (won) {
    stats.wins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.currentStreak = 0;
  }
  
  saveStats(stats);
  return stats;
}

export function getTodayKey() {
  const today = new Date();
  return `tandem_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}`;
}

export function hasPlayedToday() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getTodayKey()) !== null;
}

export function saveTodayResult(result) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(getTodayKey(), JSON.stringify({
      ...result,
      timestamp: new Date().toISOString()
    }));
  }
}

export function getTodayResult() {
  if (typeof window === 'undefined') return null;
  const result = localStorage.getItem(getTodayKey());
  return result ? JSON.parse(result) : null;
}