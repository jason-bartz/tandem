'use client';

import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useMidnightRefresh } from '@/hooks/useMidnightRefresh';
import { useReelConnectionsStats } from '@/hooks/useReelConnectionsStats';
import {
  playCorrectSound,
  playErrorSound,
  playOneAwaySound,
  playCrowdDisappointmentSound,
} from '@/lib/sounds';
import { useAuth } from '@/contexts/AuthContext';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import {
  REEL_CONFIG,
  DIFFICULTY_ORDER,
  DIFFICULTY_COLORS,
  DIFFICULTY_EMOJIS,
  CONGRATS_MESSAGES,
  ONE_AWAY_MESSAGES,
  CONFETTI_COLORS,
  REEL_STATS_KEY,
  REEL_API,
  REEL_GAME_TYPE,
} from '@/lib/reel-connections.constants';
import logger from '@/lib/logger';

/**
 * Sort groups by difficulty order (easiest to hardest)
 */
const sortGroupsByDifficulty = (groups) => {
  return [...groups].sort((a, b) => {
    const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty);
    const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty);
    return aIndex - bIndex;
  });
};

/**
 * Check if the selected movies are "one away" from a correct group
 */
const checkOneAway = (selectedMovies, puzzleGroups) => {
  for (const group of puzzleGroups) {
    const matchCount = selectedMovies.filter((m) => m.groupId === group.id).length;
    if (matchCount === 3) {
      return true;
    }
  }
  return false;
};

/**
 * Get a random message from an array
 */
const getRandomMessage = (messages) => {
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Format milliseconds to M:SS string
 */
export const formatTime = (ms) => {
  if (!ms || ms < 0) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Get local date string in YYYY-MM-DD format
 */
const getLocalDateString = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Flatten puzzle groups into movie array with group metadata
 */
const flattenPuzzleMovies = (puzzle) => {
  return puzzle.groups.flatMap((group) =>
    group.movies.map((movie) => ({
      ...movie,
      groupId: group.id,
      groupColor: group.color,
      connection: group.connection,
      textColor: group.textColor,
    }))
  );
};

/**
 * Shuffle an array using Fisher-Yates-like random sort
 */
const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

/**
 * Main game orchestration hook for Reel Connections
 */
export function useReelConnectionsGame() {
  // Core game state
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [shakeGrid, setShakeGrid] = useState(false);
  const [movies, setMovies] = useState([]);
  const [puzzle, setPuzzle] = useState(null);

  // Timer state
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [congratsMessage, setCongratsMessage] = useState("That's a Wrap!");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedGroups, setRevealedGroups] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  // One away feedback
  const [showOneAway, setShowOneAway] = useState(false);
  const [oneAwayMessage, setOneAwayMessage] = useState('');

  // Duplicate guess warning
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Solve animation state
  const [solvingGroup, setSolvingGroup] = useState(null);
  const [solvingMovies, setSolvingMovies] = useState([]);

  // Archive mode
  const [archiveDate, setArchiveDate] = useState(null);

  // Guess history for share text (tracks difficulty of each movie in each guess)
  const [guessHistory, setGuessHistory] = useState([]);

  // Track previous guesses by movie IDs to detect duplicates
  const [previousGuesses, setPreviousGuesses] = useState([]);

  // Viewing completed puzzle state
  const [viewingCompletedPuzzle, setViewingCompletedPuzzle] = useState(false);

  // Tracking state
  const [statsRecorded, setStatsRecorded] = useState(false);
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false);

  // External hooks
  const { recordGame } = useReelConnectionsStats();
  const { user } = useAuth();

  // Timer effect
  useEffect(() => {
    if (!gameWon && !gameOver && startTime) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, REEL_CONFIG.TIMER_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [gameWon, gameOver, startTime]);

  // Reveal animation effect
  useEffect(() => {
    if (!isRevealing || !puzzle) return;

    const allGroupsSorted = sortGroupsByDifficulty(puzzle.groups);
    const unrevealedGroups = allGroupsSorted.filter(
      (group) => !revealedGroups.some((rg) => rg.id === group.id)
    );

    if (unrevealedGroups.length === 0) {
      const timer = setTimeout(() => {
        setIsRevealing(false);
      }, REEL_CONFIG.REVEAL_FINAL_DELAY_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const nextGroup = unrevealedGroups[0];
      setRevealedGroups((prev) => [...prev, nextGroup]);
      setMovies((prev) => prev.filter((m) => m.groupId !== nextGroup.id));
    }, REEL_CONFIG.REVEAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isRevealing, revealedGroups, puzzle]);

  // Record stats when game ends
  useEffect(() => {
    if ((gameWon || gameOver) && endTime && startTime && !statsRecorded) {
      const timeMs = endTime - startTime;
      const puzzleDate = archiveDate || puzzle?.date;
      recordGame(gameWon, timeMs, mistakes, puzzleDate);
      setStatsRecorded(true);
    }
  }, [
    gameWon,
    gameOver,
    endTime,
    startTime,
    mistakes,
    statsRecorded,
    recordGame,
    archiveDate,
    puzzle?.date,
  ]);

  // Submit to leaderboard when game ends
  useEffect(() => {
    if (!gameWon || !endTime || !startTime || leaderboardSubmitted || !user) return;
    if (archiveDate) return; // Don't submit archive games

    const submitToLeaderboard = async () => {
      try {
        const timeSeconds = Math.floor((endTime - startTime) / 1000);
        const puzzleDate = getLocalDateString();

        const leaderboardUrl = getApiUrl(REEL_API.LEADERBOARD_DAILY);
        await capacitorFetch(leaderboardUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: REEL_GAME_TYPE,
            puzzleDate,
            score: timeSeconds,
            metadata: { mistakes },
          }),
        });

        // Sync streak to leaderboard
        const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
        const statsRaw = localStorage.getItem(REEL_STATS_KEY);
        if (statsRaw) {
          const stats = JSON.parse(statsRaw);
          if (stats.bestStreak > 0) {
            syncCurrentStreakToLeaderboard(
              { currentStreak: stats.currentStreak, bestStreak: stats.bestStreak },
              REEL_GAME_TYPE
            ).catch((err) => logger.error('Failed to sync current streak to leaderboard', err));
          }
        }

        setLeaderboardSubmitted(true);
      } catch (error) {
        logger.error('[ReelConnectionsGame] Failed to submit to leaderboard', error);
      }
    };

    submitToLeaderboard();
  }, [gameWon, endTime, startTime, leaderboardSubmitted, user, archiveDate, mistakes]);

  // Confetti effect when game is won
  useEffect(() => {
    if (gameWon && !isRevealing) {
      // Play clapping sound
      const clappingAudio = new Audio('/sounds/human_clapping_8_people.mp3');
      clappingAudio.volume = 0.26;
      clappingAudio.play().catch(() => {});

      const duration = REEL_CONFIG.CONFETTI_DURATION_MS;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: CONFETTI_COLORS,
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: CONFETTI_COLORS,
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [gameWon, isRevealing]);

  // Start reveal sequence
  const startReveal = useCallback(
    (wasWon) => {
      if (!puzzle) return;

      setEndTime(Date.now());

      if (wasWon) {
        setCongratsMessage(getRandomMessage(CONGRATS_MESSAGES));
      }

      const sortedSolvedGroups = sortGroupsByDifficulty(solvedGroups);
      setRevealedGroups(sortedSolvedGroups);
      setMovies((prev) => prev.filter((m) => !solvedGroups.some((g) => g.id === m.groupId)));
      setIsRevealing(true);
    },
    [puzzle, solvedGroups]
  );

  // Load puzzle
  const loadPuzzle = useCallback(async (isRefresh = false, specificDate = null) => {
    try {
      if (isRefresh || specificDate) {
        setLoading(true);
      }

      const dateToLoad = specificDate || getLocalDateString();
      const apiUrl = getApiUrl(`${REEL_API.PUZZLE}?date=${dateToLoad}`);
      const response = await capacitorFetch(apiUrl, {}, false); // No auth needed for puzzle fetch
      const data = await response.json();

      if (!response.ok || !data.puzzle) {
        throw new Error('Failed to load puzzle');
      }

      setError(null);
      const puzzleToUse = data.puzzle;
      setPuzzle(puzzleToUse);

      const allMovies = flattenPuzzleMovies(puzzleToUse);
      const shuffled = shuffleArray(allMovies);
      setMovies(shuffled);

      // Reset game state
      if (isRefresh || specificDate) {
        setSelectedMovies([]);
        setSolvedGroups([]);
        setMistakes(0);
        setGameWon(false);
        setGameOver(false);
        setIsRevealing(false);
        setRevealedGroups([]);
        setEndTime(null);
        setStatsRecorded(false);
        setLeaderboardSubmitted(false);
        setArchiveDate(specificDate);
        setGuessHistory([]);
        setPreviousGuesses([]);
        setShowDuplicateWarning(false);
        setViewingCompletedPuzzle(false);
      }

      setGameStarted(false);
      setStartTime(null);
      setCurrentTime(0);
    } catch (error) {
      logger.error('Error loading puzzle', error);
      setError('It seems our Puzzlemaster is a little behind. Come back shortly!');
      // Show error state - no fallback puzzle
      setPuzzle(null);
      setMovies([]);
      setGameStarted(false);
      setStartTime(null);
      setCurrentTime(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize puzzle on mount
  useEffect(() => {
    loadPuzzle(false);
  }, [loadPuzzle]);

  // Auto-refresh at midnight
  useMidnightRefresh(
    useCallback(() => {
      loadPuzzle(true);
    }, [loadPuzzle])
  );

  // Toggle movie selection
  const toggleMovieSelection = useCallback(
    (movie) => {
      if (!gameStarted) return;
      if (solvedGroups.some((g) => g.id === movie.groupId)) return;
      if (gameWon || gameOver) return;

      const isCurrentlySelected = selectedMovies.some((m) => m.imdbId === movie.imdbId);

      if (isCurrentlySelected) {
        setSelectedMovies(selectedMovies.filter((m) => m.imdbId !== movie.imdbId));
      } else if (selectedMovies.length < REEL_CONFIG.GROUP_SIZE) {
        setSelectedMovies([...selectedMovies, movie]);
      }
    },
    [gameStarted, solvedGroups, gameWon, gameOver, selectedMovies]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (selectedMovies.length !== REEL_CONFIG.GROUP_SIZE) return;
    if (solvingGroup) return; // Don't allow submit during animation

    // Check for duplicate guess
    const currentGuessKey = selectedMovies
      .map((m) => m.imdbId)
      .sort()
      .join(',');

    if (previousGuesses.includes(currentGuessKey)) {
      setShowDuplicateWarning(true);
      setTimeout(() => setShowDuplicateWarning(false), REEL_CONFIG.ONE_AWAY_DISPLAY_MS);
      return; // Don't count as mistake
    }

    // Record this guess to prevent duplicates
    setPreviousGuesses((prev) => [...prev, currentGuessKey]);

    // Record this guess to history (map each movie to its group's difficulty)
    const guessDifficulties = selectedMovies.map((movie) => {
      const group = puzzle.groups.find((g) => g.id === movie.groupId);
      return group?.difficulty || 'easiest';
    });
    setGuessHistory((prev) => [...prev, guessDifficulties]);

    const groupId = selectedMovies[0].groupId;
    const isCorrect = selectedMovies.every((m) => m.groupId === groupId);

    if (isCorrect) {
      playCorrectSound();

      const group = puzzle.groups.find((g) => g.id === groupId);

      // Start solve animation
      setSolvingGroup(group);
      setSolvingMovies([...selectedMovies]);
      setSelectedMovies([]);

      // After animation completes, finalize the solve
      setTimeout(() => {
        const newSolvedGroups = [...solvedGroups, group];
        setSolvedGroups(newSolvedGroups);
        setMovies((prev) => prev.filter((m) => m.groupId !== groupId));
        setSolvingGroup(null);
        setSolvingMovies([]);

        if (newSolvedGroups.length === puzzle.groups.length) {
          setGameWon(true);
          startReveal(true);
        }
      }, REEL_CONFIG.SOLVE_ANIMATION_MS || 800);
    } else {
      const isOneAway = checkOneAway(selectedMovies, puzzle.groups);

      if (isOneAway) {
        playOneAwaySound();
        setOneAwayMessage(getRandomMessage(ONE_AWAY_MESSAGES));
        setShowOneAway(true);
        setTimeout(() => setShowOneAway(false), REEL_CONFIG.ONE_AWAY_DISPLAY_MS);

        setTimeout(() => {
          playErrorSound();
          setShakeGrid(true);
          setTimeout(() => setShakeGrid(false), REEL_CONFIG.SHAKE_DURATION_MS);
        }, REEL_CONFIG.ONE_AWAY_SHAKE_DELAY_MS);
      } else {
        playErrorSound();
        setShakeGrid(true);
        setTimeout(() => setShakeGrid(false), REEL_CONFIG.SHAKE_DURATION_MS);
      }

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setSelectedMovies([]);

      if (newMistakes >= REEL_CONFIG.MAX_MISTAKES) {
        setGameOver(true);
        playCrowdDisappointmentSound();
        startReveal(false);
      }
    }
  }, [selectedMovies, puzzle, solvedGroups, mistakes, startReveal, solvingGroup, previousGuesses]);

  // Handle shuffle
  const handleShuffle = useCallback(() => {
    setMovies((prev) => shuffleArray(prev));
  }, []);

  // Handle deselect
  const handleDeselect = useCallback(() => {
    setSelectedMovies([]);
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    if (!puzzle) return;

    setSelectedMovies([]);
    setSolvedGroups([]);
    setMistakes(0);
    setGameWon(false);
    setGameOver(false);
    setIsRevealing(false);
    setRevealedGroups([]);
    setGameStarted(false);
    setStartTime(null);
    setCurrentTime(0);
    setEndTime(null);
    setStatsRecorded(false);
    setSolvingGroup(null);
    setSolvingMovies([]);
    setGuessHistory([]);
    setPreviousGuesses([]);
    setShowDuplicateWarning(false);
    setViewingCompletedPuzzle(false);

    const allMovies = flattenPuzzleMovies(puzzle);
    const shuffled = shuffleArray(allMovies);
    setMovies(shuffled);
  }, [puzzle]);

  // Handle archive select
  const handleArchiveSelect = useCallback(
    (date) => {
      loadPuzzle(false, date);
    },
    [loadPuzzle]
  );

  // Start game
  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    setStartTime(Date.now());
  }, []);

  // View completed puzzle
  const handleViewPuzzle = useCallback(() => {
    setViewingCompletedPuzzle(true);
  }, []);

  // View results screen
  const handleViewResults = useCallback(() => {
    setViewingCompletedPuzzle(false);
  }, []);

  // Get all groups sorted by difficulty for completed puzzle view
  const getCompletedGroupsSorted = useCallback(() => {
    if (!puzzle) return [];
    return sortGroupsByDifficulty(puzzle.groups).map((group) => ({
      ...group,
      color: DIFFICULTY_COLORS[group.difficulty] || 'bg-gray-400',
    }));
  }, [puzzle]);

  // Handle share
  const handleShare = useCallback(async () => {
    // Format date as M/D/YYYY
    const dateStr = archiveDate
      ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        });

    // Convert guess history to emoji grid (NYT Connections style)
    const emojiGrid = guessHistory
      .map((guess) => guess.map((difficulty) => DIFFICULTY_EMOJIS[difficulty] || '⬜').join(''))
      .join('\n');

    // Format completion time
    const timeStr = startTime && endTime ? `⏱️ ${formatTime(endTime - startTime)}\n` : '';

    const shareText = `Reel Connections\n${dateStr}\n${timeStr}${emojiGrid}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    } catch (err) {
      logger.error('Failed to copy', err);
    }
  }, [archiveDate, guessHistory, startTime, endTime]);

  // Helper functions
  const isSelected = useCallback(
    (movie) => selectedMovies.some((m) => m.imdbId === movie.imdbId),
    [selectedMovies]
  );

  const isSolved = useCallback(
    (movie) => solvedGroups.some((g) => g.id === movie.groupId),
    [solvedGroups]
  );

  return {
    // State
    error,
    selectedMovies,
    solvedGroups,
    mistakes,
    gameWon,
    gameOver,
    shakeGrid,
    movies,
    puzzle,
    startTime,
    endTime,
    currentTime,
    loading,
    congratsMessage,
    isRevealing,
    revealedGroups,
    gameStarted,
    showOneAway,
    showDuplicateWarning,
    oneAwayMessage,
    archiveDate,
    user,
    solvingGroup,
    solvingMovies,
    viewingCompletedPuzzle,

    // Actions
    toggleMovieSelection,
    handleSubmit,
    handleShuffle,
    handleDeselect,
    loadPuzzle,
    resetGame,
    handleArchiveSelect,
    handleStartGame,
    handleShare,
    handleViewPuzzle,
    handleViewResults,

    // Helpers
    isSelected,
    isSolved,
    formatTime,
    getCompletedGroupsSorted,
  };
}
