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

export function getStoredStats() {
  if (typeof window === 'undefined') {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      averageTime: null
    };
  }
  
  const stats = localStorage.getItem(STORAGE_KEYS.STATS);
  const parsedStats = stats ? JSON.parse(stats) : {};
  
  return {
    gamesPlayed: parsedStats.played || 0,
    gamesWon: parsedStats.wins || 0,
    currentStreak: parsedStats.currentStreak || 0,
    maxStreak: parsedStats.bestStreak || 0,
    averageTime: parsedStats.averageTime || null
  };
}

export function getGameHistory() {
  if (typeof window === 'undefined') return {};
  
  const history = {};
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.startsWith('tandem_')) {
      const parts = key.split('_');
      if (parts.length === 4) {
        const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          history[date] = {
            completed: parsed.won || false,
            time: parsed.time,
            mistakes: parsed.mistakes
          };
        }
      }
    }
  });
  
  return history;
}