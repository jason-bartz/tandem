'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useMidnightRefresh } from '@/hooks/useMidnightRefresh';
import { useReelConnectionsStats } from '@/hooks/useReelConnectionsStats';
import {
  HowToPlayModal,
  AboutModal,
  StatsModal,
  ArchiveModal,
  ReelConnectionsAuthModal,
} from './modals';
import ReelConnectionsLoadingSkeleton from './ReelConnectionsLoadingSkeleton';
import { useAuth } from '@/contexts/AuthContext';

const ReelConnectionsGame = () => {
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [selectionOrder, setSelectionOrder] = useState(new Map()); // Track selection order
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [shakeGrid, setShakeGrid] = useState(false);
  const [movies, setMovies] = useState([]);
  const [puzzle, setPuzzle] = useState(null);

  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [congratsMessage, setCongratsMessage] = useState("That's a Wrap!");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedGroups, setRevealedGroups] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Modal states
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [statsRecorded, setStatsRecorded] = useState(false);
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false);

  // Archive mode - when playing a past puzzle
  const [archiveDate, setArchiveDate] = useState(null);

  // Stats hook
  const { recordGame } = useReelConnectionsStats();

  // Auth hook
  const { user } = useAuth();

  // Movie-themed congratulatory messages
  const CONGRATS_MESSAGES = [
    "That's a Wrap!",
    'Blockbuster Performance!',
    'Two Thumbs Up!',
    'Oscar Worthy!',
    'Star Performance!',
    'Box Office Smash!',
    "Director's Cut!",
    'Standing Ovation!',
    'Five Star Review!',
    'Award Winning!',
  ];

  // Difficulty order for sorting groups
  const DIFFICULTY_ORDER = ['easiest', 'easy', 'medium', 'hardest'];

  // Function to sort groups by difficulty
  const sortGroupsByDifficulty = (groups) => {
    return [...groups].sort((a, b) => {
      const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty);
      const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty);
      return aIndex - bIndex;
    });
  };

  // Sample puzzle data (in production, this would come from an API)
  const samplePuzzle = {
    groups: [
      {
        id: '1',
        connection: 'Directed by Christopher Nolan',
        difficulty: 'easiest', // Yellow
        color: 'bg-[#ffce00]', // Yellow
        textColor: 'text-[#2c2c2c]',
        movies: [
          {
            imdbId: 'tt1375666',
            title: 'Inception',
            year: '2010',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0468569',
            title: 'The Dark Knight',
            year: '2008',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0816692',
            title: 'Interstellar',
            year: '2014',
            poster:
              'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt5013056',
            title: 'Dunkirk',
            year: '2017',
            poster:
              'https://m.media-amazon.com/images/M/MV5BN2YyZjQ0NTEtNzU5MS00NGZkLTg0MTEtYzJmMWY3MWRhZjM2XkEyXkFqcGdeQXVyMDA4NzMyOA@@._V1_SX300.jpg',
          },
        ],
      },
      {
        id: '2',
        connection: 'Marvel Cinematic Universe',
        difficulty: 'easy', // Green
        color: 'bg-[#7ed957]', // Green
        textColor: 'text-[#2c2c2c]',
        movies: [
          {
            imdbId: 'tt0848228',
            title: 'The Avengers',
            year: '2012',
            poster:
              'https://m.media-amazon.com/images/M/MV5BNDYxNjQyMjAtNTdiOS00NGYwLWFmNTAtNThmYjU5ZGI2YTI1XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt1843866',
            title: 'Captain America: The Winter Soldier',
            year: '2014',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMzA2NDkwODAwM15BMl5BanBnXkFtZTgwODk5MTgzMTE@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt3498820',
            title: 'Captain America: Civil War',
            year: '2016',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMjQ0MTgyNjAxMV5BMl5BanBnXkFtZTgwNjUzMDkyODE@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt4154756',
            title: 'Avengers: Infinity War',
            year: '2018',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNzY1MTUwNTM@._V1_SX300.jpg',
          },
        ],
      },
      {
        id: '3',
        connection: 'Won Best Picture Oscar',
        difficulty: 'medium', // Blue
        color: 'bg-[#39b6ff]', // Blue
        textColor: 'text-[#2c2c2c]',
        movies: [
          {
            imdbId: 'tt0111161',
            title: 'The Shawshank Redemption',
            year: '1994',
            poster:
              'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0068646',
            title: 'The Godfather',
            year: '1972',
            poster:
              'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0167260',
            title: 'The Lord of the Rings: The Return of the King',
            year: '2003',
            poster:
              'https://m.media-amazon.com/images/M/MV5BNzA5ZDNlZWMtM2NhNS00NDJjLTk4NDItYTRmY2EwMWZlMTY3XkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0073486',
            title: "One Flew Over the Cuckoo's Nest",
            year: '1975',
            poster:
              'https://m.media-amazon.com/images/M/MV5BZjA0OWVhOTAtYWQxNi00YzNhLWI4ZjYtNjFjZTEyYjJlNDVlL2ltYWdlL2ltYWdlXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg',
          },
        ],
      },
      {
        id: '4',
        connection: 'Features Time Travel',
        difficulty: 'hardest', // Purple
        color: 'bg-[#cb6ce6]', // Purple
        textColor: 'text-[#2c2c2c]',
        movies: [
          {
            imdbId: 'tt0088763',
            title: 'Back to the Future',
            year: '1985',
            poster:
              'https://m.media-amazon.com/images/M/MV5BZmU0M2Y1OGUtZjIxNi00ZjBkLTg1MjgtOWIyNThiZWIwYjRiXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0481499',
            title: 'Looper',
            year: '2012',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMTg5NTA3NTg4NF5BMl5BanBnXkFtZTcwNTA0NDYzOA@@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0435761',
            title: 'Toy Story 3',
            year: '2010',
            poster:
              'https://m.media-amazon.com/images/M/MV5BMTgxOTY4Mjc0MF5BMl5BanBnXkFtZTcwNTA4MDQyMw@@._V1_SX300.jpg',
          },
          {
            imdbId: 'tt0133093',
            title: 'The Matrix',
            year: '1999',
            poster:
              'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlL2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
          },
        ],
      },
    ],
  };

  // Timer effect
  useEffect(() => {
    if (!gameWon && !gameOver && startTime) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameWon, gameOver, startTime]);

  // Reveal animation effect - triggers when game ends
  useEffect(() => {
    if (!isRevealing || !puzzle) return;

    const allGroupsSorted = sortGroupsByDifficulty(puzzle.groups);

    // Find groups that haven't been revealed yet
    const unrevealedGroups = allGroupsSorted.filter(
      (group) => !revealedGroups.some((rg) => rg.id === group.id)
    );

    if (unrevealedGroups.length === 0) {
      // All groups revealed, wait 1 second then show final screen
      const timer = setTimeout(() => {
        setIsRevealing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Reveal the next group after 1 second
    const timer = setTimeout(() => {
      const nextGroup = unrevealedGroups[0];
      setRevealedGroups((prev) => [...prev, nextGroup]);
      // Clear movies for this group from the grid
      setMovies((prev) => prev.filter((m) => m.groupId !== nextGroup.id));
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRevealing, revealedGroups, puzzle]);

  // Record stats when game ends
  useEffect(() => {
    if ((gameWon || gameOver) && endTime && startTime && !statsRecorded) {
      const timeMs = endTime - startTime;
      recordGame(gameWon, timeMs, mistakes);
      setStatsRecorded(true);
    }
  }, [gameWon, gameOver, endTime, startTime, mistakes, statsRecorded, recordGame]);

  // Submit to leaderboard when game ends (for authenticated users)
  useEffect(() => {
    if (!gameWon || !endTime || !startTime || leaderboardSubmitted || !user) return;
    if (archiveDate) return; // Don't submit archive games

    const submitToLeaderboard = async () => {
      try {
        const timeSeconds = Math.floor((endTime - startTime) / 1000);
        const today = new Date();
        const puzzleDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Submit daily speed score
        await fetch('/api/leaderboard/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            gameType: 'reel',
            puzzleDate,
            score: timeSeconds,
            metadata: { mistakes },
          }),
        });

        // Sync streak to leaderboard
        const { syncCurrentStreakToLeaderboard } = await import('@/lib/leaderboardSync');
        const statsRaw = localStorage.getItem('reel-connections-stats');
        if (statsRaw) {
          const stats = JSON.parse(statsRaw);
          if (stats.bestStreak > 0) {
            syncCurrentStreakToLeaderboard(
              { currentStreak: stats.currentStreak, bestStreak: stats.bestStreak },
              'reel'
            ).catch(console.error);
          }
        }

        setLeaderboardSubmitted(true);
      } catch (error) {
        console.error('[ReelConnectionsGame] Failed to submit to leaderboard:', error);
      }
    };

    submitToLeaderboard();
  }, [gameWon, endTime, startTime, leaderboardSubmitted, user, archiveDate, mistakes]);

  // Function to start the reveal sequence
  const startReveal = (wasWon) => {
    if (!puzzle) return;

    // Set the end time
    setEndTime(Date.now());

    // Pick a random congrats message
    if (wasWon) {
      setCongratsMessage(CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)]);
    }

    // Start with already solved groups, sorted by difficulty
    const sortedSolvedGroups = sortGroupsByDifficulty(solvedGroups);
    setRevealedGroups(sortedSolvedGroups);

    // Clear the grid of solved movies
    setMovies(movies.filter((m) => !solvedGroups.some((g) => g.id === m.groupId)));

    // Start the reveal animation
    setIsRevealing(true);
  };

  // Load puzzle function - can be called on mount, midnight, or for archive
  const loadPuzzle = useCallback(async (isRefresh = false, specificDate = null) => {
    try {
      if (isRefresh || specificDate) {
        setLoading(true);
      }

      // Use local date, not UTC (toISOString uses UTC which causes wrong day after 7pm EST)
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dateToLoad = specificDate || localDateStr;
      const response = await fetch(`/api/reel-connections/puzzle?date=${dateToLoad}`);
      const data = await response.json();

      let puzzleToUse = samplePuzzle;

      if (response.ok && data.puzzle) {
        puzzleToUse = data.puzzle;
      }

      setPuzzle(puzzleToUse);

      // Flatten and shuffle movies
      const allMovies = puzzleToUse.groups.flatMap((group) =>
        group.movies.map((movie) => ({
          ...movie,
          groupId: group.id,
          groupColor: group.color,
          connection: group.connection,
          textColor: group.textColor,
        }))
      );

      // Shuffle array
      const shuffled = allMovies.sort(() => Math.random() - 0.5);
      setMovies(shuffled);

      // Reset game state for new puzzle
      if (isRefresh || specificDate) {
        setSelectedMovies([]);
        setSelectionOrder(new Map());
        setSolvedGroups([]);
        setMistakes(0);
        setGameWon(false);
        setGameOver(false);
        setIsRevealing(false);
        setRevealedGroups([]);
        setEndTime(null);
        setStatsRecorded(false);
        setLeaderboardSubmitted(false);
        // Set archive date if loading a specific date
        setArchiveDate(specificDate);
      }

      // Reset game started state - timer will start when user clicks "Action!"
      setGameStarted(false);
      setStartTime(null);
      setCurrentTime(0);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      // Fallback to sample puzzle
      setPuzzle(samplePuzzle);
      const allMovies = samplePuzzle.groups.flatMap((group) =>
        group.movies.map((movie) => ({
          ...movie,
          groupId: group.id,
          groupColor: group.color,
          connection: group.connection,
          textColor: group.textColor,
        }))
      );
      const shuffled = allMovies.sort(() => Math.random() - 0.5);
      setMovies(shuffled);
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

  // Auto-refresh at midnight local time
  useMidnightRefresh(
    useCallback(() => {
      loadPuzzle(true);
    }, [loadPuzzle])
  );

  const toggleMovieSelection = (movie) => {
    if (!gameStarted) return;
    if (solvedGroups.some((g) => g.id === movie.groupId)) return;
    if (gameWon || gameOver) return;

    if (isSelected(movie)) {
      // Deselect
      setSelectedMovies(selectedMovies.filter((m) => m.imdbId !== movie.imdbId));
      const newOrder = new Map(selectionOrder);
      newOrder.delete(movie.imdbId);
      setSelectionOrder(newOrder);
    } else {
      if (selectedMovies.length < 4) {
        const newSelected = [...selectedMovies, movie];
        setSelectedMovies(newSelected);
        const newOrder = new Map(selectionOrder);
        newOrder.set(movie.imdbId, newSelected.length);
        setSelectionOrder(newOrder);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedMovies.length !== 4) return;

    // Check if all selected movies are from the same group
    const groupId = selectedMovies[0].groupId;
    const isCorrect = selectedMovies.every((m) => m.groupId === groupId);

    if (isCorrect) {
      // Find the group
      const group = puzzle.groups.find((g) => g.id === groupId);
      const newSolvedGroups = [...solvedGroups, group];
      setSolvedGroups(newSolvedGroups);
      setSelectedMovies([]);
      setSelectionOrder(new Map());

      // Remove solved movies from the grid
      setMovies(movies.filter((m) => m.groupId !== groupId));

      // Check if all groups are solved
      if (newSolvedGroups.length === puzzle.groups.length) {
        setGameWon(true);
        // Start reveal animation to show all groups in difficulty order (like failure does)
        startReveal(true);
      }
    } else {
      // Wrong guess
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setShakeGrid(true);
      setTimeout(() => setShakeGrid(false), 500);
      setSelectedMovies([]);
      setSelectionOrder(new Map());

      if (newMistakes >= 4) {
        setGameOver(true);
        // Start reveal animation to show all groups
        startReveal(false);
      }
    }
  };

  const handleShuffle = () => {
    const shuffled = [...movies].sort(() => Math.random() - 0.5);
    setMovies(shuffled);
  };

  const handleDeselect = () => {
    setSelectedMovies([]);
    setSelectionOrder(new Map());
  };

  const resetGame = () => {
    setSelectedMovies([]);
    setSelectionOrder(new Map());
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
    // Re-shuffle all movies using current puzzle
    const puzzleToUse = puzzle || samplePuzzle;
    const allMovies = puzzleToUse.groups.flatMap((group) =>
      group.movies.map((movie) => ({
        ...movie,
        groupId: group.id,
        groupColor: group.color,
        connection: group.connection,
        textColor: group.textColor,
      }))
    );
    const shuffled = allMovies.sort(() => Math.random() - 0.5);
    setMovies(shuffled);
  };

  // Handle archive date selection
  const handleArchiveSelect = (date) => {
    loadPuzzle(false, date);
  };

  const formatTime = (ms) => {
    // Handle edge cases like negative time
    if (!ms || ms < 0) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    const timeStr = endTime && startTime ? formatTime(endTime - startTime) : '0:00';
    // Use archive date if in archive mode, otherwise use today's date
    const dateStr = archiveDate
      ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US');
    // Create emoji string: 4 slots total.
    // If 0 mistakes: 🍿🍿🍿🍿
    // If 1 mistake: ❌🍿🍿🍿
    // If 2 mistakes: ❌❌🍿🍿
    // etc.
    const xCount = mistakes;
    const popcornCount = 4 - mistakes;
    const mistakeEmojis = '❌'.repeat(xCount) + '🍿'.repeat(popcornCount);

    const shareText = `Reel Connections ${dateStr}\nYou won!\n${mistakeEmojis}\nTime: ${timeStr}`;

    navigator.clipboard.writeText(shareText).then(() => {
      alert('Results copied to clipboard!');
    });
  };

  const isSelected = (movie) => selectedMovies.some((m) => m.imdbId === movie.imdbId);
  const isSolved = (movie) => solvedGroups.some((g) => g.id === movie.groupId);

  // Start the game - called when user clicks "Action!" button
  const handleStartGame = () => {
    setGameStarted(true);
    setStartTime(Date.now());
  };

  // Reveal phase - showing groups one by one after game over
  if (isRevealing && gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex items-center justify-center p-4 film-grain">
        <div className="w-full max-w-2xl">
          {/* Header during reveal */}
          <div className="relative cinema-gradient rounded-2xl border-[4px] border-[#ffce00] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
              {[...Array(12)].map((_, i) => (
                <Image
                  key={`top-${i}`}
                  src="/icons/ui/marquee-light.webp"
                  alt=""
                  width={16}
                  height={16}
                  className="marquee-lights"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <div className="mt-4 mb-4 text-center">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Revealing Answers...</h2>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
              {[...Array(12)].map((_, i) => (
                <Image
                  key={`bottom-${i}`}
                  src="/icons/ui/marquee-light.webp"
                  alt=""
                  width={16}
                  height={16}
                  className="marquee-lights"
                  style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
                />
              ))}
            </div>
          </div>

          {/* Revealed Groups */}
          {revealedGroups.map((group, idx) => (
            <div
              key={group.id}
              className={`mb-4 p-4 rounded-2xl border-[3px] border-border-main shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${group.color} animate-fade-in-up`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <h3 className={`text-center font-bold text-lg mb-3 ${group.textColor}`}>
                {group.connection}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {group.movies.map((movie) => (
                  <div key={movie.imdbId} className="text-center">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-border-main shadow-[2px_2px_0px_rgba(0,0,0,0.3)] mb-1">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className={`text-xs font-semibold ${group.textColor} truncate px-1`}>
                      {movie.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Remaining movies grid */}
          {movies.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-6 opacity-50">
              {movies.map((movie) => (
                <div key={movie.imdbId} className="flex flex-col">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden border-[4px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] mb-1">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-white text-xs font-semibold text-center truncate px-1">
                    {movie.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if ((gameWon || gameOver) && !isRevealing) {
    const timeStr = endTime && startTime ? formatTime(endTime - startTime) : '0:00';
    const dateStr = archiveDate
      ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US');
    const isWin = gameWon;
    const isArchivePuzzle = archiveDate !== null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex flex-col items-center py-4 px-4 film-grain">
        {/* Header Links */}
        <div className="w-full max-w-md flex items-center justify-between px-2 mb-3">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
          >
            How to Play
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowArchive(true)}
              className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
            >
              Stats
            </button>
          </div>
        </div>

        <div className="w-full max-w-md relative cinema-gradient rounded-2xl border-[4px] border-[#ffce00] shadow-[8px_8px_0px_rgba(0,0,0,0.8)] p-8 text-center animate-fade-in-up overflow-hidden">
          {/* Top Marquee Lights */}
          <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
            {[...Array(8)].map((_, i) => (
              <Image
                key={`top-${i}`}
                src="/icons/ui/marquee-light.webp"
                alt=""
                width={16}
                height={16}
                className="marquee-lights"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          <div className="flex justify-center mb-6 mt-4">
            <Image
              src="/images/reel-connections-end.png"
              alt={isWin ? 'Success' : 'Game Over'}
              width={128}
              height={128}
              className="drop-shadow-md object-contain"
            />
          </div>

          <h2 className="text-4xl font-black text-white mb-2 tracking-tight drop-shadow-lg">
            {isWin ? congratsMessage : 'Cut!'}
          </h2>
          <p className="text-white/90 text-lg mb-8 drop-shadow-md font-black">
            {isWin
              ? isArchivePuzzle
                ? 'You solved this puzzle!'
                : "You solved today's puzzle!"
              : 'Better luck next time!'}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 backdrop-blur-sm border-[3px] border-black rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center">
              <p className="text-white font-black text-xl mb-1 drop-shadow">{timeStr}</p>
              <p className="text-white/70 text-xs font-bold capitalize tracking-wider">Time</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border-[3px] border-black rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center">
              <p className="text-white font-black text-xl mb-1 drop-shadow">{mistakes}/4</p>
              <p className="text-white/70 text-xs font-bold capitalize tracking-wider">Mistakes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border-[3px] border-black rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center">
              <p className="text-white font-black text-xl mb-1 drop-shadow">{dateStr}</p>
              <p className="text-white/70 text-xs font-bold capitalize tracking-wider">Date</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {isWin && (
              <button
                onClick={handleShare}
                className="w-full py-4 bg-[#ffce00] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg capitalize tracking-wide gold-glow"
              >
                Share Results
              </button>
            )}

            {/* Stats & Leaderboard button */}
            <button
              onClick={() => setShowStats(true)}
              className="w-full py-4 bg-[#cb6ce6] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-white font-black text-lg capitalize tracking-wide hover:brightness-110"
            >
              Stats & Leaderboard
            </button>

            {/* Join Leaderboard CTA for non-authenticated users */}
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full py-4 bg-[#7ed957] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg capitalize tracking-wide hover:brightness-110"
              >
                Join Leaderboard
              </button>
            )}

            <button
              onClick={resetGame}
              className="w-full py-4 bg-white/10 backdrop-blur-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-white font-black text-lg capitalize tracking-wide hover:bg-white/20"
            >
              Play Again
            </button>

            <button
              onClick={() => setShowArchive(true)}
              className="w-full py-4 bg-[#39b6ff] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg capitalize tracking-wide hover:brightness-110"
            >
              Play the Archive
            </button>
          </div>

          {/* Bottom Marquee Lights */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
            {[...Array(8)].map((_, i) => (
              <Image
                key={`bottom-${i}`}
                src="/icons/ui/marquee-light.webp"
                alt=""
                width={16}
                height={16}
                className="marquee-lights"
                style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 text-center animate-fade-in delay-500">
          <p className="text-white/80 font-medium">
            If you enjoy daily word puzzles, check out our other games{' '}
            <a
              href="https://www.tandemdaily.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ffce00] hover:underline font-bold"
            >
              here
            </a>
            !
          </p>
        </div>

        {/* Footer - anchored to bottom */}
        <div className="mt-auto pt-8 text-center space-y-2">
          <button
            onClick={() => setShowAbout(true)}
            className="text-white/50 hover:text-[#ffce00] text-sm font-medium transition-colors"
          >
            About
          </button>
          <p className="text-white/30 text-xs">© 2025 Good Vibes Games</p>
        </div>

        {/* Modals - must be included here for links to work */}
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
        <ArchiveModal
          isOpen={showArchive}
          onClose={() => setShowArchive(false)}
          onSelectDate={handleArchiveSelect}
        />
        <ReelConnectionsAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
          onSuccess={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  if (loading) {
    return <ReelConnectionsLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex items-center justify-center p-4 film-grain">
      <div className="w-full max-w-2xl">
        {/* Header Links */}
        <div className="flex items-center justify-between px-2 mb-3">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
          >
            How to Play
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowArchive(true)}
              className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
            >
              Stats
            </button>
          </div>
        </div>

        {/* Cinematic Marquee Header */}
        <div className="relative cinema-gradient rounded-2xl border-[4px] border-[#ffce00] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-6 mb-6 overflow-hidden">
          {/* Top Marquee Lights */}
          <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
            {[...Array(12)].map((_, i) => (
              <Image
                key={`top-${i}`}
                src="/icons/ui/marquee-light.webp"
                alt=""
                width={16}
                height={16}
                className="marquee-lights"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          {/* Header Content */}
          <div className="mt-4 mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Image
                src="/icons/ui/movie.png"
                alt="Movie icon"
                width={24}
                height={24}
                className="flex-shrink-0"
              />
              <h1 className="text-2xl font-bold text-white tracking-tight whitespace-nowrap drop-shadow-lg">
                Reel Connections
              </h1>
              <span className="px-2 py-0.5 bg-[#ffce00] text-[#0f0f1e] text-xs font-black uppercase tracking-wider rounded-md shadow-sm transform -rotate-2">
                BETA
              </span>
            </div>
            <p className="text-white/70 text-sm text-center mt-1 font-bold">
              {archiveDate
                ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : puzzle?.date
                  ? new Date(puzzle.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
            </p>
          </div>

          {/* Mistakes and Timer */}
          <div className="flex items-center justify-between gap-4 px-2">
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => {
                  const isMistake = i < mistakes;
                  return (
                    <div
                      key={i}
                      className="w-8 h-8 flex items-center justify-center transition-all"
                    >
                      {isMistake ? (
                        <Image
                          src="/icons/ui/wrong.png"
                          alt="Mistake"
                          width={24}
                          height={24}
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      ) : (
                        <Image
                          src="/icons/ui/popcorn.png"
                          alt="Remaining"
                          width={24}
                          height={24}
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-white text-xs font-bold text-center drop-shadow">
                {4 - mistakes} mistake{4 - mistakes !== 1 ? 's' : ''} left
              </p>
            </div>
            <div className="relative">
              <div className="px-4 py-2 flex flex-col items-center">
                <p className="text-white text-2xl font-bold tabular-nums drop-shadow-lg text-center w-full">
                  {formatTime(currentTime)}
                </p>
                <p className="text-white/80 text-xs font-black text-center tracking-wider w-full">
                  Time
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Marquee Lights */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
            {[...Array(12)].map((_, i) => (
              <Image
                key={`bottom-${i}`}
                src="/icons/ui/marquee-light.webp"
                alt=""
                width={16}
                height={16}
                className="marquee-lights"
                style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
              />
            ))}
          </div>
        </div>

        {/* Solved Groups */}
        {solvedGroups.map((group, idx) => (
          <div
            key={group.id}
            className={`mb-4 p-4 rounded-2xl border-[3px] border-border-main shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${group.color} animate-fade-in-up`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <h3 className={`text-center font-bold text-lg mb-3 ${group.textColor}`}>
              {group.connection}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {group.movies.map((movie) => (
                <div key={movie.imdbId} className="text-center">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-border-main shadow-[2px_2px_0px_rgba(0,0,0,0.3)] mb-1">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className={`text-xs font-semibold ${group.textColor} truncate px-1`}>
                    {movie.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Movie Grid with Ready Modal */}
        {!gameWon && !gameOver && (
          <div className="relative">
            {/* Movie Grid */}
            <div
              className={`grid grid-cols-4 gap-3 mb-6 transition-all duration-300 ${shakeGrid ? 'animate-error-shake' : ''} ${!gameStarted ? 'blur-md pointer-events-none select-none' : ''}`}
            >
              {movies.map((movie) => {
                const selected = isSelected(movie);
                const orderNumber = selectionOrder.get(movie.imdbId);
                return (
                  <div key={movie.imdbId} className="flex flex-col relative">
                    <button
                      onClick={() => toggleMovieSelection(movie)}
                      disabled={isSolved(movie) || !gameStarted}
                      className={`aspect-[2/3] rounded-xl overflow-hidden border-[4px] transition-all transform hover:scale-105 active:scale-95 mb-1 ${
                        selected
                          ? 'border-[#ffce00] shadow-[4px_4px_0px_rgba(255,206,0,0.5)] -translate-y-2 gold-glow'
                          : 'border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                      }`}
                    >
                      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
                        <img
                          src={movie.poster}
                          alt={`Movie from ${movie.year}`}
                          className="w-full h-full object-cover"
                        />
                        {selected && (
                          <>
                            <div className="absolute inset-0 bg-[rgba(255,206,0,0.15)] rounded-lg" />
                            {/* Selection Order Badge - Responsive sizing */}
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 bg-[#ffce00] border-[2px] sm:border-[3px] border-white rounded-full flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                              <span className="text-[#2c2c2c] text-xs sm:text-sm font-bold">
                                {orderNumber}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                    <div className="overflow-hidden px-1">
                      <p
                        className={`text-white text-xs font-semibold text-center whitespace-nowrap ${
                          selected ? 'animate-marquee' : 'truncate'
                        }`}
                      >
                        {selected ? `${movie.title}  •  ${movie.title}` : movie.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready to Start Modal Overlay */}
            {!gameStarted && (
              <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] rounded-2xl border-[3px] border-[#ffce00] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-6 text-center animate-fade-in-up mx-4 pointer-events-auto">
                  <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
                    Ready to start?
                  </h3>
                  <p className="text-white/70 text-sm mb-4">Create four groups of four movies</p>
                  <button
                    onClick={handleStartGame}
                    className="px-8 py-3 bg-[#ffce00] border-[3px] border-black rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg tracking-wide gold-glow"
                  >
                    Action!
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        {!gameWon && !gameOver && gameStarted && (
          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-sm border-[3px] border-white/30 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:shadow-[1px_1px_0px_rgba(0,0,0,0.5)] transform hover:-translate-y-1 active:translate-y-0 transition-all text-white font-bold text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Shuffle
            </button>
            <button
              onClick={handleDeselect}
              disabled={selectedMovies.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-sm border-[3px] border-white/30 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:shadow-[1px_1px_0px_rgba(0,0,0,0.5)] transform hover:-translate-y-1 active:translate-y-0 transition-all text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedMovies.length !== 4}
              className={`flex items-center gap-2 px-6 py-3 border-[4px] rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform transition-all font-bold text-sm ${
                selectedMovies.length === 4
                  ? 'cinema-gradient border-[#ffce00] text-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] active:translate-y-0 active:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] gold-glow'
                  : 'bg-white/5 border-white/20 text-white/30 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Submit
            </button>
          </div>
        )}

        {/* Footer with About and Copyright */}
        <div className="text-center mt-8 space-y-2">
          <button
            onClick={() => setShowAbout(true)}
            className="text-white/50 hover:text-[#ffce00] text-sm font-medium transition-colors"
          >
            About
          </button>
          <p className="text-white/30 text-xs">© 2025 Good Vibes Games</p>
        </div>
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ArchiveModal
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectDate={handleArchiveSelect}
      />
    </div>
  );
};

export default ReelConnectionsGame;
