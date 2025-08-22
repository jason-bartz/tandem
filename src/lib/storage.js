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

export function updateGameStats(won, isFirstAttempt = true, isArchiveGame = false) {
  const stats = loadStats();
  
  // Always count towards total games played
  stats.played++;
  
  if (won) {
    // Always count wins
    stats.wins++;
    
    // Only update streak for first-try daily puzzle wins (not archive games)
    if (isFirstAttempt && !isArchiveGame) {
      stats.currentStreak++;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    }
  } else {
    // Only reset streak for daily puzzle losses on first attempt
    if (isFirstAttempt && !isArchiveGame) {
      stats.currentStreak = 0;
    }
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

export function savePuzzleResult(date, result) {
  if (typeof window !== 'undefined') {
    const dateObj = new Date(date + 'T00:00:00');
    const key = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
    localStorage.setItem(key, JSON.stringify({
      ...result,
      timestamp: new Date().toISOString()
    }));
  }
}

export function savePuzzleProgress(date, progress) {
  if (typeof window !== 'undefined') {
    const dateObj = new Date(date + 'T00:00:00');
    const key = `tandem_progress_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
    const existing = localStorage.getItem(key);
    const existingData = existing ? JSON.parse(existing) : {};
    
    localStorage.setItem(key, JSON.stringify({
      ...existingData,
      ...progress,
      lastUpdated: new Date().toISOString()
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
      
      // Handle completed/failed games
      if (parts.length === 4 && parts[0] === 'tandem' && parts[1] !== 'progress') {
        const date = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          history[date] = {
            ...history[date],
            completed: parsed.won || false,
            failed: parsed.won === false, // Explicitly failed
            time: parsed.time,
            mistakes: parsed.mistakes,
            status: parsed.won ? 'completed' : 'failed'
          };
        }
      }
      
      // Handle in-progress/attempted games
      if (parts[1] === 'progress' && parts.length === 5) {
        const date = `${parts[2]}-${parts[3].padStart(2, '0')}-${parts[4].padStart(2, '0')}`;
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          // Only mark as attempted if there's no completion record
          if (!history[date] || !history[date].status) {
            history[date] = {
              ...history[date],
              attempted: true,
              status: 'attempted',
              lastPlayed: parsed.lastUpdated,
              solved: parsed.solved || 0,
              mistakes: parsed.mistakes || 0
            };
          }
        }
      }
    }
  });
  
  return history;
}