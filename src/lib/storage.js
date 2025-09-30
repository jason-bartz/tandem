import { STORAGE_KEYS } from './constants';

function getTodayDateString() {
  const { toZonedTime } = require('date-fns-tz');
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etToday = toZonedTime(now, etTimeZone);
  return `${etToday.getFullYear()}-${String(etToday.getMonth() + 1).padStart(2, '0')}-${String(etToday.getDate()).padStart(2, '0')}`;
}

function getYesterdayDateString(todayString) {
  const date = new Date(todayString + 'T00:00:00');
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function loadStats() {
  if (typeof window === 'undefined') {
    return { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };
  }

  const stats = localStorage.getItem(STORAGE_KEYS.STATS);
  const parsedStats = stats
    ? JSON.parse(stats)
    : { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };

  // Check if streak should be reset due to missed days
  checkAndUpdateStreak(parsedStats);

  return parsedStats;
}

function checkAndUpdateStreak(stats) {
  // Only check if there's an active streak
  if (stats.currentStreak > 0 && stats.lastStreakDate) {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString(today);

    // If last streak date is not yesterday or today, reset streak
    if (stats.lastStreakDate !== yesterday && stats.lastStreakDate !== today) {
      stats.currentStreak = 0;
      // Don't update lastStreakDate here, keep it for history
      saveStats(stats);
    }
  }
}

export function saveStats(stats) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }
}

export function updateGameStats(
  won,
  isFirstAttempt = true,
  isArchiveGame = false,
  puzzleDate = null
) {
  const stats = loadStats();

  // Count games played for first attempts only (both daily and archive)
  if (isFirstAttempt) {
    stats.played++;
  }

  if (won) {
    // Count wins for first attempts only (both daily and archive)
    if (isFirstAttempt) {
      stats.wins++;
    }

    // Streak logic - only for daily puzzle first attempts
    if (isFirstAttempt && !isArchiveGame) {
      // Check if we played yesterday (for consecutive days)
      const lastStreakDate = stats.lastStreakDate;
      const today = puzzleDate || getTodayDateString();
      const yesterday = getYesterdayDateString(today);

      if (!lastStreakDate) {
        // No previous streak, start at 1
        stats.currentStreak = 1;
      } else if (lastStreakDate === yesterday) {
        // Played and won yesterday, continue streak
        stats.currentStreak++;
      } else if (lastStreakDate === today) {
        // Already played today, don't update
        // This handles multiple attempts on the same day
      } else {
        // Missed one or more days, restart streak
        stats.currentStreak = 1;
      }

      // Update last streak date
      stats.lastStreakDate = today;

      // Update best streak if needed
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    }
  } else {
    // Only reset streak for daily puzzle losses on first attempt
    if (isFirstAttempt && !isArchiveGame) {
      stats.currentStreak = 0;
      stats.lastStreakDate = puzzleDate || getTodayDateString();
    }
  }

  saveStats(stats);
  return stats;
}

export function getTodayKey() {
  // Use Eastern Time for consistency with puzzle rotation
  const { toZonedTime } = require('date-fns-tz');
  const etTimeZone = 'America/New_York';
  const now = new Date();
  const etToday = toZonedTime(now, etTimeZone);
  return `tandem_${etToday.getFullYear()}_${etToday.getMonth() + 1}_${etToday.getDate()}`;
}

export function hasPlayedToday() {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(getTodayKey()) !== null;
}

export function hasPlayedPuzzle(date) {
  if (typeof window === 'undefined') {
    return false;
  }
  const dateObj = new Date(date + 'T00:00:00');
  const key = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
  return localStorage.getItem(key) !== null;
}

export function saveTodayResult(result) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      getTodayKey(),
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export function savePuzzleResult(date, result) {
  if (typeof window !== 'undefined') {
    const dateObj = new Date(date + 'T00:00:00');
    const key = `tandem_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export function savePuzzleProgress(date, progress) {
  if (typeof window !== 'undefined') {
    const dateObj = new Date(date + 'T00:00:00');
    const key = `tandem_progress_${dateObj.getFullYear()}_${dateObj.getMonth() + 1}_${dateObj.getDate()}`;
    const existing = localStorage.getItem(key);
    const existingData = existing ? JSON.parse(existing) : {};

    localStorage.setItem(
      key,
      JSON.stringify({
        ...existingData,
        ...progress,
        lastUpdated: new Date().toISOString(),
      })
    );
  }
}

export function getTodayResult() {
  if (typeof window === 'undefined') {
    return null;
  }
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
      averageTime: null,
    };
  }

  const stats = localStorage.getItem(STORAGE_KEYS.STATS);
  const parsedStats = stats ? JSON.parse(stats) : {};

  return {
    gamesPlayed: parsedStats.played || 0,
    gamesWon: parsedStats.wins || 0,
    currentStreak: parsedStats.currentStreak || 0,
    maxStreak: parsedStats.bestStreak || 0,
    averageTime: parsedStats.averageTime || null,
  };
}

export function getGameHistory() {
  if (typeof window === 'undefined') {
    return {};
  }

  const history = {};
  const keys = Object.keys(localStorage);

  keys.forEach((key) => {
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
            theme: parsed.theme, // Include the saved theme
            status: parsed.won ? 'completed' : 'failed',
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
              mistakes: parsed.mistakes || 0,
            };
          }
        }
      }
    }
  });

  return history;
}
