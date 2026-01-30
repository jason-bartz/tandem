'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Menu, ChevronLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useReelConnectionsGame } from '@/hooks/useReelConnectionsGame';
import {
  REEL_CONFIG,
  DIFFICULTY_COLORS,
  DIFFICULTY_COLORS_HC,
  DIFFICULTY_ORDER,
} from '@/lib/reel-connections.constants';
import { playClapperSound } from '@/lib/sounds';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Capacitor } from '@capacitor/core';
import ReelConnectionsLoadingSkeleton from './ReelConnectionsLoadingSkeleton';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import Settings from '@/components/Settings';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import FloatingStatsBar from './FloatingStatsBar';
import FixedButtonBar from './FixedButtonBar';
import LearnToPlayBanner from '@/components/shared/LearnToPlayBanner';
import { useFloatingStatsBar } from '@/hooks/useFloatingStatsBar';

// Long press duration in milliseconds
const LONG_PRESS_DURATION = 650;

// PosterModal component for enlarged poster view
const PosterModal = ({ movie, onClose, reduceMotion = false, highContrast = false }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!movie) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${reduceMotion ? '' : 'animate-backdrop-enter'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Enlarged poster for ${movie.title}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`relative max-w-sm w-full ${reduceMotion ? '' : 'animate-modal-enter'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute -top-3 -right-3 z-10 w-10 h-10 border-[3px] rounded-full flex items-center justify-center shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform ${highContrast ? 'bg-hc-primary border-hc-border' : 'bg-[#ffce00] border-black'}`}
          aria-label="Close enlarged poster"
        >
          <X className={`w-5 h-5 ${highContrast ? 'text-white' : 'text-[#0f0f1e]'}`} />
        </button>

        {/* Poster */}
        <div
          className={`rounded-2xl overflow-hidden border-[4px] shadow-[8px_8px_0px_rgba(0,0,0,0.8)] ${highContrast ? 'border-hc-border' : 'border-[#ffce00]'}`}
        >
          <img src={movie.poster} alt={movie.title} className="w-full h-auto object-cover" />
        </div>

        {/* Movie Title */}
        <div className="mt-4 text-center">
          <h3
            className={`text-lg font-bold drop-shadow-lg ${highContrast ? 'text-hc-text' : 'text-white'}`}
          >
            {movie.title}
          </h3>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};

// Difficulty display names for hints
const DIFFICULTY_NAMES = {
  easiest: 'Matinee',
  easy: 'Feature',
  medium: 'Premiere',
  hardest: 'Gala',
};

// Difficulty tier labels
const DIFFICULTY_TIERS = {
  easiest: 'Easiest',
  easy: 'Easy',
  medium: 'Medium',
  hardest: 'Hardest',
};

// HintModal component for showing category hints
const HintModal = ({
  isOpen,
  onClose,
  hintCategory,
  reduceMotion = false,
  highContrast = false,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !hintCategory) return null;

  const difficultyName = DIFFICULTY_NAMES[hintCategory.difficulty] || 'Category';
  const difficultyTier = DIFFICULTY_TIERS[hintCategory.difficulty] || '';
  const groupColor = highContrast
    ? DIFFICULTY_COLORS_HC[hintCategory.difficulty]
    : DIFFICULTY_COLORS[hintCategory.difficulty];

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${reduceMotion ? '' : 'animate-backdrop-enter'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Hint"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-md mx-4 ${reduceMotion ? '' : 'animate-slide-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`rounded-2xl border-[3px] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] overflow-hidden ${highContrast ? 'bg-hc-surface border-hc-border' : 'bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] border-[#ffce00]'}`}
        >
          {/* Header */}
          <div
            className={`flex items-center gap-3 px-5 py-4 border-b-2 ${highContrast ? 'border-hc-border' : 'border-white/10'}`}
          >
            <Image
              src="/icons/ui/hint.png"
              alt="Hint"
              width={28}
              height={28}
              className="flex-shrink-0"
            />
            <h2
              className={`text-xl font-bold drop-shadow-lg ${highContrast ? 'text-hc-text' : 'text-white'}`}
            >
              Hint
            </h2>
          </div>

          {/* Content */}
          <div className="px-5 py-6">
            <p
              className={`text-sm font-medium mb-3 ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
            >
              Category Difficulty: {difficultyName} ({difficultyTier})
            </p>
            <div
              className={`${groupColor} rounded-xl px-4 py-3 border-[3px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)]`}
            >
              <p
                className={`text-lg font-bold text-center ${highContrast ? 'text-white' : 'text-black'}`}
              >
                {hintCategory.connection}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-6">
            <button
              onClick={onClose}
              className={`w-full py-3 border-[3px] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-lg ${highContrast ? 'bg-hc-primary text-white border-hc-border' : 'bg-[#ffce00] text-[#2c2c2c] border-black'}`}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};

const TicketButton = ({ icon, label, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative transition-all duration-200 ${
      disabled
        ? 'opacity-50 grayscale cursor-not-allowed'
        : 'hover:-translate-y-0.5 active:translate-y-0 cursor-pointer hover:brightness-110'
    } ${className}`}
  >
    <div className="relative filter drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">
      <img src={icon} alt={label} className="w-24 h-12 sm:w-32 sm:h-14 object-contain" />
      <span className="absolute inset-0 flex items-center justify-center font-bold text-xs sm:text-sm tracking-wide text-[#2c2c2c] transform -rotate-1">
        {label}
      </span>
    </div>
  </button>
);

// Helper to get group color based on high contrast mode
const getGroupColor = (difficulty, highContrast) => {
  if (highContrast) {
    return DIFFICULTY_COLORS_HC[difficulty] || 'bg-gray-600';
  }
  return DIFFICULTY_COLORS[difficulty] || 'bg-gray-400';
};

const ReelConnectionsGame = ({ titleFont = '' }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lightTap } = useHaptics();
  const { reduceMotion, highContrast } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const { user } = useAuth();

  // Sidebar and unified modal states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [enlargedMovie, setEnlargedMovie] = useState(null);
  const [enlargePromptMovie, setEnlargePromptMovie] = useState(null);
  const [clapperClosed, setClapperClosed] = useState(false);

  // Hint system state
  const [hintUsed, setHintUsed] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);

  // Completion flow state
  const [showingCompletedPuzzle, setShowingCompletedPuzzle] = useState(false);
  const [showCompleteScreen, setShowCompleteScreen] = useState(false);

  // Long press refs
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  // Ref for auto-scrolling to game area on mobile
  const gameAreaRef = useRef(null);

  // Game hook
  const {
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
    solvingGroup,
    solvingMovies,
    viewingCompletedPuzzle,
    toggleMovieSelection,
    handleSubmit,
    handleShuffle,
    handleDeselect,
    handleArchiveSelect,
    handleStartGame,
    handleShare,
    handleViewPuzzle,
    isSelected,
    isSolved,
    formatTime,
    getCompletedGroupsSorted,
  } = useReelConnectionsGame();

  // Floating stats bar state
  const {
    scrollContainerRef,
    showStatsBar,
    hideStatsBar,
    showNavRow,
    isCompactVisible,
    isCompactHidden,
    isFullHeader,
  } = useFloatingStatsBar({
    gameStarted,
    gameWon,
    gameOver,
  });

  // Elastic pull-down state
  const [pullOffset, setPullOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartRef = useRef(null);
  const pullStartScrollRef = useRef(0);

  // Rubber-band resistance function (iOS-style)
  const rubberBand = useCallback((distance, dimension = 300) => {
    const constant = 0.55;
    return (distance * dimension * constant) / (dimension + constant * distance);
  }, []);

  // Handle elastic pull gesture
  const handlePullStart = useCallback(
    (e) => {
      const container = scrollContainerRef.current;
      if (!container || !gameStarted || gameWon || gameOver) return;

      // Only allow pulling when at the top AND compact bar is visible
      if (container.scrollTop === 0 && isCompactVisible) {
        pullStartRef.current = {
          y: e.touches[0].clientY,
          time: Date.now(),
        };
        pullStartScrollRef.current = container.scrollTop;
        setIsPulling(true);
      }
    },
    [gameStarted, gameWon, gameOver, isCompactVisible, scrollContainerRef]
  );

  const handlePullMove = useCallback(
    (e) => {
      if (!pullStartRef.current || !isPulling) return;

      const container = scrollContainerRef.current;
      if (!container) return;

      // Only allow pulling down (positive delta)
      const deltaY = e.touches[0].clientY - pullStartRef.current.y;

      if (deltaY > 0 && container.scrollTop === 0) {
        // Apply rubber-band resistance
        const resistedPull = rubberBand(deltaY);
        setPullOffset(resistedPull);

        // Prevent default scrolling
        e.preventDefault();
      }
    },
    [isPulling, rubberBand, scrollContainerRef]
  );

  const handlePullEnd = useCallback(() => {
    if (!pullStartRef.current || !isPulling) return;

    const threshold = 60; // Trigger threshold

    if (pullOffset > threshold) {
      // Trigger full header reveal
      lightTap();
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Reset pull state
    setPullOffset(0);
    setIsPulling(false);
    pullStartRef.current = null;
  }, [isPulling, pullOffset, lightTap, scrollContainerRef]);

  // Reset hint state when puzzle changes
  useEffect(() => {
    setHintUsed(false);
    setShowHintModal(false);
  }, [puzzle?.date, archiveDate]);

  // Handle completion flow - show completed puzzle view after last group locks in
  useEffect(() => {
    if (gameWon) {
      // Immediately show completed puzzle view (no delay)
      setShowingCompletedPuzzle(true);
      setShowCompleteScreen(false);

      // Play clapping sound
      const clappingAudio = new Audio('/sounds/human_clapping_8_people.mp3');
      clappingAudio.volume = 0.26;
      clappingAudio.play().catch(() => {});

      // After 2 seconds, transition to celebration screen
      const timer = setTimeout(() => {
        setShowingCompletedPuzzle(false);
        setShowCompleteScreen(true);
      }, 2000);

      return () => clearTimeout(timer);
    } else if (!gameWon) {
      // Reset states when game resets
      setShowingCompletedPuzzle(false);
      setShowCompleteScreen(false);
    }
  }, [gameWon]);

  // Track if we've already loaded an archive puzzle from URL
  const archiveLoadedRef = useRef(false);

  // Load archive puzzle from URL parameter on mount
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && !loading && !archiveLoadedRef.current) {
      // Validate date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        archiveLoadedRef.current = true;
        handleArchiveSelect(dateParam);
      }
    }
  }, [searchParams, handleArchiveSelect, loading]);

  // Handle starting the game with clapper animation and auto-scroll on mobile
  const onStartGame = useCallback(() => {
    // Close the clapper and play sound
    setClapperClosed(true);
    playClapperSound();

    // Delay before starting the game to let the animation play
    setTimeout(() => {
      handleStartGame();
      setClapperClosed(false); // Reset for next time

      // Note: Auto-scroll disabled - compact bar will appear in place
      // The top padding on main content prevents grid cutoff
    }, 400);
  }, [handleStartGame]);

  // Long press handlers for enlarging posters
  const handlePosterPressStart = useCallback((movie) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setEnlargePromptMovie(movie);
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePosterPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handler for clicking the "Enlarge?" banner
  const handleEnlargeClick = useCallback((movie, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEnlargePromptMovie(null);
    setEnlargedMovie(movie);
  }, []);

  const handlePosterClick = useCallback(
    (movie, e) => {
      // If long press was triggered, don't toggle selection
      if (longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Dismiss any enlarge prompt when clicking on a poster
      setEnlargePromptMovie(null);
      toggleMovieSelection(movie);
    },
    [toggleMovieSelection]
  );

  // Get the lowest unsolved difficulty category for hints
  const getLowestUnsolvedCategory = useCallback(() => {
    if (!puzzle) return null;
    const solvedGroupIds = solvedGroups.map((g) => g.id);
    const unsolvedGroups = puzzle.groups.filter((g) => !solvedGroupIds.includes(g.id));
    if (unsolvedGroups.length === 0) return null;

    // Sort by difficulty order and return the easiest unsolved
    return unsolvedGroups.sort((a, b) => {
      const aIndex = DIFFICULTY_ORDER.indexOf(a.difficulty);
      const bIndex = DIFFICULTY_ORDER.indexOf(b.difficulty);
      return aIndex - bIndex;
    })[0];
  }, [puzzle, solvedGroups]);

  // Handle hint button click
  const handleHintClick = useCallback(() => {
    if (hintUsed) return;
    const category = getLowestUnsolvedCategory();
    if (category) {
      setHintUsed(true);
      setShowHintModal(true);
    }
  }, [hintUsed, getLowestUnsolvedCategory]);

  // Reveal phase - showing groups one by one after game over
  if (isRevealing && gameOver) {
    return (
      <div
        className={`!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden ${highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain'}`}
      >
        <div className="min-h-full flex items-start justify-center p-4 pt-8">
          <div className="w-full max-w-2xl pb-8">
            {/* Header during reveal */}
            <div
              className={`relative rounded-2xl border-[4px] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-6 mb-6 overflow-hidden ${highContrast ? 'bg-hc-surface border-hc-border' : 'cinema-gradient border-[#ffce00]'}`}
            >
              <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
                {[...Array(12)].map((_, i) => (
                  <Image
                    key={`top-${i}`}
                    src="/icons/ui/marquee-light.webp"
                    alt=""
                    width={16}
                    height={16}
                    className={reduceMotion ? '' : 'marquee-lights'}
                    style={reduceMotion ? {} : { animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="mt-4 mb-4 text-center">
                <h2
                  className={`text-2xl font-bold drop-shadow-lg ${highContrast ? 'text-hc-text' : 'text-white'}`}
                >
                  Revealing Answers...
                </h2>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
                {[...Array(12)].map((_, i) => (
                  <Image
                    key={`bottom-${i}`}
                    src="/icons/ui/marquee-light.webp"
                    alt=""
                    width={16}
                    height={16}
                    className={reduceMotion ? '' : 'marquee-lights'}
                    style={reduceMotion ? {} : { animationDelay: `${i * 0.1 + 0.05}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Revealed Groups */}
            {revealedGroups.map((group, idx) => {
              const groupColor = highContrast ? getGroupColor(group.difficulty, true) : group.color;
              return (
                <div
                  key={group.id}
                  className={`mb-2 sm:mb-3 ${reduceMotion ? '' : 'animate-fade-in-up'}`}
                  style={reduceMotion ? {} : { animationDelay: `${idx * 50}ms` }}
                >
                  {/* Colored background container */}
                  <div
                    className={`${groupColor} rounded-xl sm:rounded-2xl p-2 sm:p-3 border-[3px] sm:border-[4px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] relative`}
                  >
                    {/* Poster row */}
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {group.movies.map((movie) => (
                        <div
                          key={movie.imdbId}
                          className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-black/30 shadow-[1px_1px_0px_rgba(0,0,0,0.3)]"
                        >
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Connection name overlay - centered across posters */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`${groupColor} px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]`}
                      >
                        <h3
                          className={`text-center font-bold text-xs sm:text-sm ${highContrast ? 'text-white' : group.textColor} drop-shadow-sm`}
                        >
                          {group.connection}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Remaining movies grid */}
            {movies.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-6 opacity-50">
                {movies.map((movie) => (
                  <div key={movie.imdbId} className="flex flex-col">
                    <div
                      className={`aspect-[2/3] rounded-xl overflow-hidden border-[4px] shadow-[3px_3px_0px_rgba(0,0,0,0.5)] mb-1 ${highContrast ? 'border-hc-border' : 'border-black'}`}
                    >
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p
                      className={`text-xs font-semibold text-center truncate px-1 ${highContrast ? 'text-hc-text' : 'text-white'}`}
                    >
                      {movie.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completed puzzle view - shows all groups in difficulty order
  // Show if: user manually viewing (!isRevealing required) OR auto-showing after win (isRevealing can be true)
  if ((viewingCompletedPuzzle && !isRevealing) || showingCompletedPuzzle) {
    const completedGroups = getCompletedGroupsSorted();
    const dateStr = archiveDate
      ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : puzzle?.date
        ? new Date(puzzle.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

    return (
      <div
        className={`!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden ${highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain'}`}
      >
        <div className="min-h-full flex items-start justify-center p-2 sm:p-4 pt-safe">
          <div className="w-full max-w-md sm:max-w-lg pb-8">
            {/* Header with Back Button and Hamburger Menu */}
            <div className="max-w-2xl w-full mx-auto px-4 flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  lightTap();
                  router.push('/');
                }}
                className={`w-12 h-12 flex items-center justify-center transition-colors rounded-xl ${highContrast ? 'text-hc-text hover:text-hc-primary' : 'text-white/80 hover:text-[#ffce00]'}`}
                aria-label="Back to home"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={() => {
                  lightTap();
                  setIsSidebarOpen(true);
                }}
                className={`w-12 h-12 flex items-center justify-center transition-colors rounded-xl ${highContrast ? 'text-hc-text hover:text-hc-primary' : 'text-white/80 hover:text-[#ffce00]'}`}
                aria-label="Open menu"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                <Menu className="w-7 h-7" />
              </button>
            </div>

            {/* Cinematic Marquee Header */}
            <div
              className={`relative rounded-2xl border-[3px] sm:border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,0.8)] sm:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden ${highContrast ? 'bg-hc-surface border-hc-border' : 'cinema-gradient border-[#ffce00]'}`}
            >
              {/* Top Marquee Lights */}
              <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
                {[...Array(12)].map((_, i) => (
                  <Image
                    key={`top-${i}`}
                    src="/icons/ui/marquee-light.webp"
                    alt=""
                    width={16}
                    height={16}
                    className={reduceMotion ? '' : 'marquee-lights'}
                    style={reduceMotion ? {} : { animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>

              {/* Header Content */}
              <div className="mt-5 sm:mt-6 mb-3 sm:mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <Image
                    src="/icons/ui/movie.png"
                    alt="Movie icon"
                    width={20}
                    height={20}
                    className="flex-shrink-0 sm:w-6 sm:h-6"
                  />
                  <h1
                    className={`${titleFont} text-xl sm:text-2xl tracking-tight whitespace-nowrap drop-shadow-lg ${highContrast ? 'text-hc-text' : 'text-white'}`}
                  >
                    Reel Connections
                  </h1>
                </div>
                <p
                  className={`text-xs sm:text-sm font-medium ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                >
                  {dateStr}
                </p>
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
                    className={reduceMotion ? '' : 'marquee-lights'}
                    style={reduceMotion ? {} : { animationDelay: `${i * 0.1 + 0.05}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Completed Groups - sorted by difficulty */}
            {completedGroups.map((group, idx) => {
              const groupColor = highContrast ? getGroupColor(group.difficulty, true) : group.color;
              return (
                <div
                  key={group.id}
                  className={`mb-2 sm:mb-3 ${reduceMotion ? '' : 'animate-fade-in-up'}`}
                  style={reduceMotion ? {} : { animationDelay: `${idx * 50}ms` }}
                >
                  {/* Colored background container */}
                  <div
                    className={`${groupColor} rounded-xl sm:rounded-2xl p-2 sm:p-3 border-[3px] sm:border-[4px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] relative`}
                  >
                    {/* Poster row */}
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {group.movies.map((movie) => (
                        <div
                          key={movie.imdbId}
                          className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-black/30 shadow-[1px_1px_0px_rgba(0,0,0,0.3)]"
                        >
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Connection name overlay - centered across posters */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`${groupColor} px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]`}
                      >
                        <h3
                          className={`text-center font-bold text-xs sm:text-sm ${highContrast ? 'text-white' : 'text-black'} drop-shadow-sm`}
                        >
                          {group.connection}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Menu */}
        <SidebarMenu
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenStats={() => setShowStats(true)}
          onOpenArchive={() => setShowArchive(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Unified Modals */}
        <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
        <UnifiedArchiveCalendar
          isOpen={showArchive}
          onClose={() => setShowArchive(false)}
          onSelectPuzzle={(date) => {
            setShowArchive(false);
            handleArchiveSelect(date);
          }}
          defaultTab="reel"
        />
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
          defaultTab="reel"
        />
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  // Game complete screen
  if (
    (gameWon && showCompleteScreen) ||
    (gameOver && !isRevealing && !viewingCompletedPuzzle && !showingCompletedPuzzle)
  ) {
    const timeStr = endTime && startTime ? formatTime(endTime - startTime) : '0:00';
    const dateStr = archiveDate
      ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US');
    const isWin = gameWon;
    const isArchivePuzzle = archiveDate !== null;

    return (
      <div
        className={`!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden ${highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain'}`}
      >
        <div className="min-h-full flex flex-col items-center pt-safe px-4 pb-8">
          {/* Header with Back Button and Hamburger Menu */}
          <div className="max-w-2xl w-full mx-auto px-4 flex items-center justify-between mb-3">
            <button
              onClick={() => {
                lightTap();
                router.push('/');
              }}
              className={`w-12 h-12 flex items-center justify-center transition-colors rounded-xl ${highContrast ? 'text-hc-text hover:text-hc-primary' : 'text-white/80 hover:text-[#ffce00]'}`}
              aria-label="Back to home"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={() => {
                lightTap();
                setIsSidebarOpen(true);
              }}
              className={`w-12 h-12 flex items-center justify-center transition-colors rounded-xl ${highContrast ? 'text-hc-text hover:text-hc-primary' : 'text-white/80 hover:text-[#ffce00]'}`}
              aria-label="Open menu"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <Menu className="w-7 h-7" />
            </button>
          </div>

          <div
            className={`w-full max-w-md relative rounded-2xl border-[4px] shadow-[8px_8px_0px_rgba(0,0,0,0.8)] p-8 text-center ${reduceMotion ? '' : 'animate-fade-in-up'} overflow-hidden ${highContrast ? 'bg-hc-surface border-hc-border' : 'cinema-gradient border-[#ffce00]'}`}
          >
            {/* Top Marquee Lights */}
            <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
              {[...Array(8)].map((_, i) => (
                <Image
                  key={`top-${i}`}
                  src="/icons/ui/marquee-light.webp"
                  alt=""
                  width={16}
                  height={16}
                  className={reduceMotion ? '' : 'marquee-lights'}
                  style={reduceMotion ? {} : { animationDelay: `${i * 0.1}s` }}
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

            <h2
              className={`text-2xl sm:text-4xl font-bold mb-2 tracking-tight drop-shadow-lg whitespace-nowrap ${highContrast ? 'text-hc-text' : 'text-white'}`}
            >
              {isWin ? congratsMessage : 'Cut!'}
            </h2>
            <p
              className={`text-lg mb-8 drop-shadow-md font-semibold ${highContrast ? 'text-hc-text/90' : 'text-white/90'}`}
            >
              {isWin
                ? isArchivePuzzle
                  ? 'You solved this puzzle!'
                  : "You solved today's puzzle!"
                : 'Better luck next time!'}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div
                className={`backdrop-blur-sm border-[3px] rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center ${highContrast ? 'bg-hc-background border-hc-border' : 'bg-ghost-white/10 border-black'}`}
              >
                <p
                  className={`font-bold text-xl mb-1 drop-shadow ${highContrast ? 'text-hc-text' : 'text-white'}`}
                >
                  {timeStr}
                </p>
                <p
                  className={`text-xs font-semibold capitalize tracking-wide ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                >
                  Time
                </p>
              </div>
              <div
                className={`backdrop-blur-sm border-[3px] rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center ${highContrast ? 'bg-hc-background border-hc-border' : 'bg-ghost-white/10 border-black'}`}
              >
                <p
                  className={`font-bold text-xl mb-1 drop-shadow ${highContrast ? 'text-hc-text' : 'text-white'}`}
                >
                  {mistakes}/{REEL_CONFIG.MAX_MISTAKES}
                </p>
                <p
                  className={`text-xs font-semibold capitalize tracking-wide ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                >
                  Mistakes
                </p>
              </div>
              <div
                className={`backdrop-blur-sm border-[3px] rounded-xl p-3 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center min-w-0 ${highContrast ? 'bg-hc-background border-hc-border' : 'bg-ghost-white/10 border-black'}`}
              >
                <p
                  className={`font-bold text-sm sm:text-lg mb-1 drop-shadow whitespace-nowrap ${highContrast ? 'text-hc-text' : 'text-white'}`}
                >
                  {dateStr}
                </p>
                <p
                  className={`text-xs font-semibold capitalize tracking-wide ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                >
                  Date
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <button
                onClick={handleShare}
                className={`w-full py-4 border-[3px] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-lg capitalize tracking-wide animate-attention-pulse ${highContrast ? 'bg-hc-success text-white border-hc-border' : 'bg-[#4ade80] text-[#2c2c2c] border-black'}`}
              >
                Share Results
              </button>

              <button
                onClick={() => setShowArchive(true)}
                className={`w-full py-4 border-[3px] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-lg capitalize tracking-wide hover:brightness-110 ${highContrast ? 'bg-hc-primary text-white border-hc-border' : 'bg-[#39b6ff] text-[#2c2c2c] border-black'}`}
              >
                Play from Archive
              </button>

              <button
                onClick={() => {
                  if (hasSubscription) {
                    router.push('/create-puzzle');
                  } else if (Capacitor.isNativePlatform()) {
                    // On iOS, navigate to account page for subscription
                    router.push('/account');
                  } else {
                    // On web, trigger paywall modal
                    window.dispatchEvent(new CustomEvent('openPaywall'));
                  }
                }}
                className={`w-full py-4 border-[3px] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-lg capitalize tracking-wide hover:brightness-110 ${highContrast ? 'bg-hc-warning text-black border-hc-border' : 'bg-[#ef4444] text-white border-black'}`}
              >
                Create Your Own Puzzle
              </button>

              <button
                onClick={handleViewPuzzle}
                className={`w-full py-4 border-[3px] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-lg capitalize tracking-wide hover:brightness-110 ${highContrast ? 'bg-hc-warning text-black border-hc-border' : 'bg-[#ffce00] text-[#2c2c2c] border-black'}`}
              >
                Back To Puzzle
              </button>
            </div>

            {/* Account CTA for non-logged-in users */}
            {!user && (
              <div
                className={`mt-4 pt-4 border-t-2 ${highContrast ? 'border-hc-border' : 'border-white/20'}`}
              >
                <p className={`text-sm mb-3 ${highContrast ? 'text-hc-text/80' : 'text-white/80'}`}>
                  Your progress will be lost! Create a free account to join the leaderboard, track
                  your stats, and sync across devices!
                </p>
                <button
                  onClick={() => {
                    lightTap();
                    setShowAuthModal(true);
                  }}
                  className={`px-6 py-2.5 border-[3px] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm ${highContrast ? 'bg-hc-primary text-white border-hc-border' : 'bg-[#39b6ff] text-white border-black'}`}
                >
                  Create Free Account
                </button>
              </div>
            )}

            {/* Bottom Marquee Lights */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
              {[...Array(8)].map((_, i) => (
                <Image
                  key={`bottom-${i}`}
                  src="/icons/ui/marquee-light.webp"
                  alt=""
                  width={16}
                  height={16}
                  className={reduceMotion ? '' : 'marquee-lights'}
                  style={reduceMotion ? {} : { animationDelay: `${i * 0.1 + 0.05}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Menu */}
        <SidebarMenu
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenStats={() => setShowStats(true)}
          onOpenArchive={() => setShowArchive(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Unified Modals */}
        <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
        <UnifiedArchiveCalendar
          isOpen={showArchive}
          onClose={() => setShowArchive(false)}
          onSelectPuzzle={(date) => {
            setShowArchive(false);
            handleArchiveSelect(date);
          }}
          defaultTab="reel"
        />
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
          defaultTab="reel"
        />
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
          onSuccess={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <ReelConnectionsLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div
        className={`!fixed inset-0 w-full h-full flex items-center justify-center ${highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e]'}`}
      >
        <div
          className={`rounded-2xl border-[3px] p-8 max-w-md text-center mx-4 ${highContrast ? 'bg-hc-surface border-hc-border' : 'bg-[#2a2a4a] border-[#ffce00]'}`}
        >
          <p className={`mb-6 ${highContrast ? 'text-hc-text' : 'text-white/70'}`}>{error}</p>
          <button
            onClick={() => router.push('/')}
            className={`px-6 py-3 rounded-xl transition-colors ${highContrast ? 'bg-hc-primary text-hc-background' : 'bg-[#ffce00] text-gray-900 hover:bg-[#ffd633]'}`}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main game screen
  return (
    <div
      ref={scrollContainerRef}
      className={`!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden ${highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain'}`}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      onTouchCancel={handlePullEnd}
    >
      {/* Header with Back Button and Hamburger Menu - Conditionally visible */}
      <div
        className={`pt-safe pt-4 pb-2 fixed top-0 left-0 right-0 z-30 ${highContrast ? 'bg-hc-background' : 'bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e]/90 to-transparent'} ${!showNavRow ? 'pointer-events-none' : ''}`}
        style={{
          transform: showNavRow
            ? `translateY(${pullOffset}px)`
            : `translateY(calc(-100% + ${pullOffset}px))`,
          opacity: showNavRow ? 1 : 0,
          transition:
            isPulling || reduceMotion
              ? 'none'
              : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease',
        }}
      >
        <div className="max-w-2xl w-full mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => {
              lightTap();
              router.push('/');
            }}
            className={`w-12 h-12 flex items-center justify-center transition-colors rounded-xl ${highContrast ? 'text-hc-text hover:text-hc-primary' : 'text-white/80 hover:text-[#ffce00]'}`}
            aria-label="Back to home"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={() => {
              lightTap();
              setIsSidebarOpen(true);
            }}
            className={`w-12 h-12 flex items-center justify-center transition-colors rounded-xl ${highContrast ? 'text-hc-text hover:text-hc-primary' : 'text-white/80 hover:text-[#ffce00]'}`}
            aria-label="Open menu"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Floating Stats Bar - Below nav row */}
      {gameStarted && !gameWon && !gameOver && (
        <FloatingStatsBar
          mistakes={mistakes}
          currentTime={currentTime}
          archiveDate={archiveDate}
          puzzleDate={puzzle?.date}
          isVisible={isCompactVisible}
          isHidden={isCompactHidden}
          onShow={showStatsBar}
          onHide={hideStatsBar}
          showNavRow={showNavRow}
          pullOffset={pullOffset}
          isPulling={isPulling}
          reduceMotion={reduceMotion}
          highContrast={highContrast}
        />
      )}

      {/* Learn How to Play Banner */}
      {gameStarted && !gameWon && !gameOver && (
        <LearnToPlayBanner gameType="reel" onOpenHowToPlay={() => setShowHowToPlay(true)} />
      )}

      <div
        className="flex items-start justify-center p-2 sm:p-4"
        style={{
          transform: `translateY(${pullOffset}px)`,
          transition: isPulling ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className={`w-full max-w-md sm:max-w-lg transition-[padding] duration-300 ease-out`}
          style={{
            paddingTop: isCompactVisible
              ? showNavRow
                ? 'calc(64px + 44px + env(safe-area-inset-top, 0px) + 24px)' // Nav + compact bar
                : 'calc(44px + env(safe-area-inset-top, 0px) + 40px)' // Just compact bar - more space
              : showNavRow
                ? 'calc(64px + env(safe-area-inset-top, 0px) + 24px)' // Just nav
                : 'calc(env(safe-area-inset-top, 0px) + 24px)', // Neither visible
            paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Cinematic Marquee Header - Show only when at top or game not started */}
          {isFullHeader && (
            <div
              className={`relative rounded-2xl border-[3px] sm:border-[4px] shadow-[4px_4px_0px_rgba(0,0,0,0.8)] sm:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden ${highContrast ? 'bg-hc-surface border-hc-border' : 'cinema-gradient border-[#ffce00]'}`}
            >
              {/* Top Marquee Lights */}
              <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
                {[...Array(12)].map((_, i) => (
                  <Image
                    key={`top-${i}`}
                    src="/icons/ui/marquee-light.webp"
                    alt=""
                    width={16}
                    height={16}
                    className={reduceMotion ? '' : 'marquee-lights'}
                    style={reduceMotion ? {} : { animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>

              {/* Header Content */}
              <div className="mt-5 sm:mt-6 mb-3 sm:mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <Image
                    src="/icons/ui/movie.png"
                    alt="Movie icon"
                    width={20}
                    height={20}
                    className="flex-shrink-0 sm:w-6 sm:h-6"
                  />
                  <h1
                    className={`${titleFont} text-xl sm:text-2xl tracking-tight whitespace-nowrap drop-shadow-lg ${highContrast ? 'text-hc-text' : 'text-white'}`}
                  >
                    Reel Connections
                  </h1>
                </div>
                <p
                  className={`text-xs sm:text-sm font-medium ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                >
                  Group movies that share a common theme
                </p>
              </div>

              {/* Stats Row */}
              <div
                className={`rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 mb-4 sm:mb-5 mx-1 sm:mx-2 relative ${highContrast ? 'bg-hc-background' : 'bg-black/20'}`}
              >
                <div className="flex items-center justify-between">
                  {/* Mistakes */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1 sm:gap-1.5">
                      {[0, 1, 2, 3].map((i) => {
                        const isMistake = i < mistakes;
                        return (
                          <div
                            key={i}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center transition-all"
                          >
                            {isMistake ? (
                              <Image
                                src="/icons/ui/wrong.png"
                                alt="Mistake"
                                width={20}
                                height={20}
                                className="w-full h-full object-contain drop-shadow-md"
                              />
                            ) : (
                              <Image
                                src="/icons/ui/popcorn.png"
                                alt="Remaining"
                                width={20}
                                height={20}
                                className="w-full h-full object-contain drop-shadow-md"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p
                      className={`text-[10px] sm:text-xs font-bold ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                    >
                      Mistakes Left
                    </p>
                  </div>

                  {/* Timer - Center */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                    <p
                      className={`text-lg sm:text-xl font-bold tabular-nums drop-shadow-lg ${highContrast ? 'text-hc-text' : 'text-white'}`}
                    >
                      {formatTime(currentTime)}
                    </p>
                    <p
                      className={`text-[10px] sm:text-xs font-bold ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                    >
                      Time
                    </p>
                  </div>

                  {/* Date - Right */}
                  <div className="flex flex-col items-center gap-1">
                    <p
                      className={`text-lg sm:text-xl font-bold tabular-nums drop-shadow-lg whitespace-nowrap ${highContrast ? 'text-hc-text' : 'text-white'}`}
                    >
                      {archiveDate
                        ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : puzzle?.date
                          ? new Date(puzzle.date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : new Date().toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                    </p>
                    <p
                      className={`text-[10px] sm:text-xs font-bold ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                    >
                      Date
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
                    className={reduceMotion ? '' : 'marquee-lights'}
                    style={reduceMotion ? {} : { animationDelay: `${i * 0.1 + 0.05}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Solved Groups */}
          {solvedGroups.map((group, idx) => {
            const groupColor = highContrast ? getGroupColor(group.difficulty, true) : group.color;
            return (
              <div
                key={group.id}
                className={`mb-2 sm:mb-3 ${reduceMotion ? '' : 'animate-fade-in-up'}`}
                style={reduceMotion ? {} : { animationDelay: `${idx * 50}ms` }}
              >
                {/* Colored background container */}
                <div
                  className={`${groupColor} rounded-xl sm:rounded-2xl p-2 sm:p-3 border-[3px] sm:border-[4px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] relative`}
                >
                  {/* Poster row */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-2">
                    {group.movies.map((movie) => (
                      <div
                        key={movie.imdbId}
                        className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-black/30 shadow-[1px_1px_0px_rgba(0,0,0,0.3)]"
                      >
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Connection name overlay - centered across posters */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`${groupColor} px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]`}
                    >
                      <h3
                        className={`text-center font-bold text-xs sm:text-sm ${highContrast ? 'text-white' : group.textColor} drop-shadow-sm`}
                      >
                        {group.connection}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* One Away Toast */}
          {showOneAway && (
            <div
              className={`fixed top-1/3 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg ${reduceMotion ? '' : 'animate-one-away'}`}
              role="status"
              aria-live="polite"
            >
              {oneAwayMessage}
            </div>
          )}

          {/* Duplicate Guess Warning Toast */}
          {showDuplicateWarning && (
            <div
              className={`fixed top-1/3 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg text-center whitespace-nowrap ${reduceMotion ? '' : 'animate-one-away'}`}
              role="status"
              aria-live="polite"
            >
              Already guessed!
            </div>
          )}

          {/* Movie Grid with Ready Modal */}
          {!gameWon && !gameOver && (
            <div className="relative pb-[140px] sm:pb-[160px]" ref={gameAreaRef}>
              {/* Movie Grid */}
              <div
                className={`grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6 ${shakeGrid && !reduceMotion ? 'animate-error-shake' : ''} ${!gameStarted ? 'blur-md pointer-events-none select-none' : ''}`}
              >
                {movies.map((movie) => {
                  const selected = isSelected(movie);
                  const orderNumber = selected
                    ? selectedMovies.findIndex((m) => m.imdbId === movie.imdbId) + 1
                    : null;
                  // Check if this movie is being animated as part of a solving group
                  const solvingIndex = solvingMovies.findIndex((m) => m.imdbId === movie.imdbId);
                  const isSolving = solvingIndex !== -1;

                  return (
                    <div
                      key={movie.imdbId}
                      className={`flex flex-col relative ${
                        reduceMotion
                          ? ''
                          : isSolving
                            ? `animate-solve-jump solve-delay-${solvingIndex}`
                            : 'animate-grid-shift'
                      }`}
                    >
                      <button
                        onClick={(e) => handlePosterClick(movie, e)}
                        onMouseDown={() => handlePosterPressStart(movie)}
                        onMouseUp={handlePosterPressEnd}
                        onMouseLeave={handlePosterPressEnd}
                        onTouchStart={() => handlePosterPressStart(movie)}
                        onTouchEnd={handlePosterPressEnd}
                        onTouchCancel={handlePosterPressEnd}
                        onContextMenu={(e) => e.preventDefault()}
                        disabled={isSolved(movie) || !gameStarted || isSolving}
                        className={`aspect-[2/3] rounded-lg sm:rounded-xl overflow-hidden border-[3px] sm:border-[4px] transition-all transform hover:scale-105 active:scale-95 mb-0.5 sm:mb-1 touch-manipulation ${
                          isSolving
                            ? highContrast
                              ? 'border-hc-primary shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
                              : 'border-[#ffce00] shadow-[3px_3px_0px_rgba(255,206,0,0.5)] sm:shadow-[4px_4px_0px_rgba(255,206,0,0.5)] gold-glow'
                            : selected
                              ? highContrast
                                ? 'border-hc-primary shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] -translate-y-1 sm:-translate-y-2'
                                : 'border-[#ffce00] shadow-[3px_3px_0px_rgba(255,206,0,0.5)] sm:shadow-[4px_4px_0px_rgba(255,206,0,0.5)] -translate-y-1 sm:-translate-y-2 gold-glow'
                              : highContrast
                                ? 'border-hc-border shadow-[2px_2px_0px_rgba(0,0,0,0.5)] sm:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                                : 'border-black shadow-[2px_2px_0px_rgba(0,0,0,0.5)] sm:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                        }`}
                      >
                        <div className="relative w-full h-full bg-black overflow-hidden">
                          <img
                            src={movie.poster}
                            alt={`Movie from ${movie.year}`}
                            className="w-full h-full object-cover"
                          />
                          {selected && !isSolving && (
                            <>
                              <div
                                className={`absolute inset-0 ${highContrast ? 'bg-hc-primary/20' : 'bg-[rgba(255,206,0,0.15)]'}`}
                              />
                              <div
                                className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-5 h-5 sm:w-6 sm:h-6 border-[2px] border-white rounded-full flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,0.8)] sm:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] ${highContrast ? 'bg-hc-primary' : 'bg-[#ffce00]'}`}
                              >
                                <span
                                  className={`text-[10px] sm:text-xs font-bold ${highContrast ? 'text-white' : 'text-[#2c2c2c]'}`}
                                >
                                  {orderNumber}
                                </span>
                              </div>
                            </>
                          )}
                          {/* Enlarge? banner overlay */}
                          {enlargePromptMovie?.imdbId === movie.imdbId && (
                            <button
                              onClick={(e) => handleEnlargeClick(movie, e)}
                              className={`absolute top-0 left-0 right-0 py-1.5 sm:py-2 text-center shadow-[0_2px_4px_rgba(0,0,0,0.3)] z-10 transition-colors ${highContrast ? 'bg-hc-primary hover:bg-hc-focus' : 'bg-[#ffce00] hover:bg-[#ffd82e] active:bg-[#e6b900]'}`}
                            >
                              <span
                                className={`text-[10px] sm:text-xs font-bold tracking-wide ${highContrast ? 'text-white' : 'text-[#2c2c2c]'}`}
                              >
                                Enlarge?
                              </span>
                            </button>
                          )}
                        </div>
                      </button>
                      <div className="overflow-hidden px-0.5 sm:px-1">
                        <p
                          className={`text-[10px] sm:text-xs font-semibold text-center whitespace-nowrap ${highContrast ? 'text-hc-text' : 'text-white'} ${
                            selected && !isSolving && !reduceMotion ? 'animate-marquee' : 'truncate'
                          }`}
                        >
                          {selected && !isSolving && !reduceMotion
                            ? `${movie.title}  •  ${movie.title}`
                            : movie.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ready to Start Modal Overlay */}
              {!gameStarted && (
                <div
                  className="fixed z-10 pointer-events-none"
                  style={{ left: '50%', top: '50vh', transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    className={`rounded-xl sm:rounded-2xl border-[2px] sm:border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,0.8)] sm:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-4 sm:p-6 text-center ${reduceMotion ? '' : 'animate-fade-in-up'} mx-4 pointer-events-auto ${highContrast ? 'bg-hc-surface border-hc-border' : 'bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] border-[#ffce00]'}`}
                  >
                    <h3
                      className={`text-lg sm:text-xl font-bold mb-1 sm:mb-2 drop-shadow-lg whitespace-nowrap ${highContrast ? 'text-hc-text' : 'text-white'}`}
                    >
                      Ready to start?
                    </h3>
                    <p
                      className={`text-xs sm:text-sm font-medium mb-3 sm:mb-4 whitespace-nowrap ${highContrast ? 'text-hc-text/70' : 'text-white/70'}`}
                    >
                      Create four groups of four movies
                    </p>
                    <button
                      onClick={onStartGame}
                      className={`mx-auto flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-base sm:text-lg tracking-wide ${highContrast ? 'bg-hc-primary text-white border-hc-border' : 'bg-[#ffce00] text-[#2c2c2c] border-black gold-glow'}`}
                    >
                      Action!
                      <Image
                        src={
                          clapperClosed ? '/icons/ui/clapper-closed.png' : '/icons/ui/clapper.png'
                        }
                        alt=""
                        width={24}
                        height={24}
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls - Fixed at bottom */}
      {!gameWon && !gameOver && gameStarted && (
        <FixedButtonBar highContrast={highContrast}>
          <div className={`${solvingGroup ? 'pointer-events-none' : ''}`}>
            <div className="flex gap-3 sm:gap-4 items-center">
              <TicketButton
                icon="/icons/buttons/shuffle.svg"
                label="Shuffle"
                onClick={handleShuffle}
                disabled={!!solvingGroup}
              />
              <TicketButton
                icon="/icons/buttons/clear.svg"
                label="Clear"
                onClick={handleDeselect}
                disabled={selectedMovies.length === 0 || !!solvingGroup}
              />
              <TicketButton
                icon="/icons/buttons/hint.svg"
                label="Hint"
                onClick={handleHintClick}
                disabled={hintUsed || !!solvingGroup}
              />
              <TicketButton
                icon="/icons/buttons/submit.svg"
                label="Submit"
                onClick={handleSubmit}
                disabled={selectedMovies.length !== REEL_CONFIG.GROUP_SIZE || !!solvingGroup}
              />
            </div>
          </div>
        </FixedButtonBar>
      )}

      {/* Sidebar Menu */}
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Unified Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          handleArchiveSelect(date);
        }}
        defaultTab="reel"
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        defaultTab="reel"
      />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Poster Modal */}
      <PosterModal
        movie={enlargedMovie}
        onClose={() => setEnlargedMovie(null)}
        reduceMotion={reduceMotion}
        highContrast={highContrast}
      />

      {/* Hint Modal */}
      <HintModal
        isOpen={showHintModal}
        onClose={() => setShowHintModal(false)}
        hintCategory={getLowestUnsolvedCategory()}
        reduceMotion={reduceMotion}
        highContrast={highContrast}
      />
    </div>
  );
};

export default ReelConnectionsGame;
