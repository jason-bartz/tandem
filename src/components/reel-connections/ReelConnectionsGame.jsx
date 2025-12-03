'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useReelConnectionsGame } from '@/hooks/useReelConnectionsGame';
import { REEL_CONFIG } from '@/lib/reel-connections.constants';
import { playClapperSound } from '@/lib/sounds';
import { HowToPlayModal, AboutModal, StatsModal, ArchiveModal } from './modals';
import ReelConnectionsLoadingSkeleton from './ReelConnectionsLoadingSkeleton';

// Long press duration in milliseconds
const LONG_PRESS_DURATION = 650;

// PosterModal component for enlarged poster view
const PosterModal = ({ movie, onClose }) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-enter"
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
        className="relative max-w-sm w-full animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-10 h-10 bg-[#ffce00] border-[3px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:scale-110 transition-transform"
          aria-label="Close enlarged poster"
        >
          <X className="w-5 h-5 text-[#0f0f1e]" />
        </button>

        {/* Poster */}
        <div className="rounded-2xl overflow-hidden border-[4px] border-[#ffce00] shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
          <img src={movie.poster} alt={movie.title} className="w-full h-auto object-cover" />
        </div>

        {/* Movie Title */}
        <div className="mt-4 text-center">
          <h3 className="text-white text-lg font-bold drop-shadow-lg">{movie.title}</h3>
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
      <span className="absolute inset-0 flex items-center justify-center font-black text-xs sm:text-sm tracking-wider text-[#2c2c2c] transform -rotate-1">
        {label}
      </span>
    </div>
  </button>
);

const ReelConnectionsGame = () => {
  // Modal states
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [enlargedMovie, setEnlargedMovie] = useState(null);
  const [clapperClosed, setClapperClosed] = useState(false);

  // Long press refs
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  // Ref for auto-scrolling to game area on mobile
  const gameAreaRef = useRef(null);

  // Game hook
  const {
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
    oneAwayMessage,
    archiveDate,
    solvingGroup,
    solvingMovies,
    toggleMovieSelection,
    handleSubmit,
    handleShuffle,
    handleDeselect,
    handleArchiveSelect,
    handleStartGame,
    handleShare,
    isSelected,
    isSolved,
    formatTime,
  } = useReelConnectionsGame();

  // Handle starting the game with clapper animation and auto-scroll on mobile
  const onStartGame = useCallback(() => {
    // Close the clapper and play sound
    setClapperClosed(true);
    playClapperSound();

    // Delay before starting the game to let the animation play
    setTimeout(() => {
      handleStartGame();
      setClapperClosed(false); // Reset for next time

      // Auto-scroll to game area on mobile after a short delay for state to update
      setTimeout(() => {
        if (gameAreaRef.current) {
          gameAreaRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    }, 400);
  }, [handleStartGame]);

  // Long press handlers for enlarging posters
  const handlePosterPressStart = useCallback((movie) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setEnlargedMovie(movie);
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePosterPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePosterClick = useCallback(
    (movie, e) => {
      // If long press was triggered, don't toggle selection
      if (longPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      toggleMovieSelection(movie);
    },
    [toggleMovieSelection]
  );

  // Reveal phase - showing groups one by one after game over
  if (isRevealing && gameOver) {
    return (
      <div className="!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain">
        <div className="min-h-full flex items-start justify-center p-4 pt-8">
          <div className="w-full max-w-2xl pb-8">
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
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
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
                className="mb-2 sm:mb-3 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Colored background container */}
                <div
                  className={`${group.color} rounded-xl sm:rounded-2xl p-2 sm:p-3 border-[3px] sm:border-[4px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] relative`}
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
                      className={`${group.color} px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]`}
                    >
                      <h3
                        className={`text-center font-bold text-xs sm:text-sm ${group.textColor} drop-shadow-sm`}
                      >
                        {group.connection}
                      </h3>
                    </div>
                  </div>
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
      </div>
    );
  }

  // Game complete screen
  if ((gameWon || gameOver) && !isRevealing) {
    const timeStr = endTime && startTime ? formatTime(endTime - startTime) : '0:00';
    const dateStr = archiveDate
      ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US');
    const isWin = gameWon;
    const isArchivePuzzle = archiveDate !== null;

    return (
      <div className="!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain">
        <div className="min-h-full flex flex-col items-center py-4 px-4 pb-8">
          {/* Header Links */}
          <div className="w-full max-w-md flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHowToPlay(true)}
                className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
              >
                How to Play
              </button>
              <button
                onClick={() => setShowAbout(true)}
                className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
              >
                About
              </button>
            </div>
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
                <p className="text-white font-black text-xl mb-1 drop-shadow">
                  {mistakes}/{REEL_CONFIG.MAX_MISTAKES}
                </p>
                <p className="text-white/70 text-xs font-bold capitalize tracking-wider">
                  Mistakes
                </p>
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
                  className="w-full py-4 bg-[#4ade80] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-lg capitalize tracking-wide"
                >
                  Share Results
                </button>
              )}

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

          <div className="mt-auto pt-8 text-center">
            <p className="text-white/30 text-xs">
              © 2025 Good Vibes Games |{' '}
              <a href="/privacypolicy" className="hover:text-white/50 transition-colors">
                Privacy Policy
              </a>{' '}
              |{' '}
              <a href="/terms" className="hover:text-white/50 transition-colors">
                Terms of Use
              </a>
            </p>
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
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <ReelConnectionsLoadingSkeleton />;
  }

  // Main game screen
  return (
    <div className="!fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] film-grain">
      <div className="min-h-full flex items-start justify-center p-2 sm:p-4 pt-4">
        <div className="w-full max-w-md sm:max-w-lg pb-8">
          {/* Header Links */}
          <div className="flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHowToPlay(true)}
                className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
              >
                How to Play
              </button>
              <button
                onClick={() => setShowAbout(true)}
                className="text-white/70 hover:text-[#ffce00] text-sm font-medium transition-colors"
              >
                About
              </button>
            </div>
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
          <div className="relative cinema-gradient rounded-2xl border-[3px] sm:border-[4px] border-[#ffce00] shadow-[4px_4px_0px_rgba(0,0,0,0.8)] sm:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden">
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
            <div className="mt-5 sm:mt-6 mb-3 sm:mb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <Image
                  src="/icons/ui/movie.png"
                  alt="Movie icon"
                  width={20}
                  height={20}
                  className="flex-shrink-0 sm:w-6 sm:h-6"
                />
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight whitespace-nowrap drop-shadow-lg">
                  Reel Connections
                </h1>
              </div>
              <p className="text-white/70 text-xs sm:text-sm font-medium">
                Group movies that share a common theme
              </p>
            </div>

            {/* Stats Row */}
            <div className="bg-black/20 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 mb-4 sm:mb-5 mx-1 sm:mx-2 relative">
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
                  <p className="text-white/70 text-[10px] sm:text-xs font-bold">Mistakes Left</p>
                </div>

                {/* Timer - Center */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                  <p className="text-white text-lg sm:text-xl font-bold tabular-nums drop-shadow-lg">
                    {formatTime(currentTime)}
                  </p>
                  <p className="text-white/70 text-[10px] sm:text-xs font-bold">Time</p>
                </div>

                {/* Date - Right */}
                <div className="flex flex-col items-center gap-1">
                  <p className="text-white text-lg sm:text-xl font-bold tabular-nums drop-shadow-lg whitespace-nowrap">
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
                  <p className="text-white/70 text-[10px] sm:text-xs font-bold">Date</p>
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
              className="mb-2 sm:mb-3 animate-fade-in-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Colored background container */}
              <div
                className={`${group.color} rounded-xl sm:rounded-2xl p-2 sm:p-3 border-[3px] sm:border-[4px] border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] relative`}
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
                    className={`${group.color} px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.3)]`}
                  >
                    <h3
                      className={`text-center font-bold text-xs sm:text-sm ${group.textColor} drop-shadow-sm`}
                    >
                      {group.connection}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* One Away Toast */}
          {showOneAway && (
            <div
              className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-one-away"
              role="status"
              aria-live="polite"
            >
              {oneAwayMessage}
            </div>
          )}

          {/* Movie Grid with Ready Modal */}
          {!gameWon && !gameOver && (
            <div className="relative" ref={gameAreaRef}>
              {/* Movie Grid */}
              <div
                className={`grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6 transition-all duration-300 ${shakeGrid ? 'animate-error-shake' : ''} ${!gameStarted ? 'blur-md pointer-events-none select-none' : ''}`}
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
                        isSolving
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
                            ? 'border-[#ffce00] shadow-[3px_3px_0px_rgba(255,206,0,0.5)] sm:shadow-[4px_4px_0px_rgba(255,206,0,0.5)] gold-glow'
                            : selected
                              ? 'border-[#ffce00] shadow-[3px_3px_0px_rgba(255,206,0,0.5)] sm:shadow-[4px_4px_0px_rgba(255,206,0,0.5)] -translate-y-1 sm:-translate-y-2 gold-glow'
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
                              <div className="absolute inset-0 bg-[rgba(255,206,0,0.15)]" />
                              <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-5 h-5 sm:w-6 sm:h-6 bg-[#ffce00] border-[2px] border-white rounded-full flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,0.8)] sm:shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                                <span className="text-[#2c2c2c] text-[10px] sm:text-xs font-bold">
                                  {orderNumber}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                      <div className="overflow-hidden px-0.5 sm:px-1">
                        <p
                          className={`text-white text-[10px] sm:text-xs font-semibold text-center whitespace-nowrap ${
                            selected && !isSolving ? 'animate-marquee' : 'truncate'
                          }`}
                        >
                          {selected && !isSolving
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
                <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] rounded-xl sm:rounded-2xl border-[2px] sm:border-[3px] border-[#ffce00] shadow-[4px_4px_0px_rgba(0,0,0,0.8)] sm:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-4 sm:p-6 text-center animate-fade-in-up mx-4 pointer-events-auto">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">
                      Ready to start?
                    </h3>
                    <p className="text-white/70 text-xs sm:text-sm mb-1 sm:mb-2">
                      Create four groups of four movies
                    </p>
                    <p className="text-white/50 text-[10px] sm:text-xs mb-3 sm:mb-4">
                      Long press posters to enlarge
                    </p>
                    <button
                      onClick={onStartGame}
                      className="flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[#ffce00] border-[2px] sm:border-[3px] border-black rounded-lg sm:rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] sm:shadow-[4px_4px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[#2c2c2c] font-black text-base sm:text-lg tracking-wide gold-glow"
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

          {/* Controls */}
          {!gameWon && !gameOver && gameStarted && (
            <div
              className={`flex gap-3 sm:gap-6 justify-center mb-4 sm:mb-6 items-center transition-opacity ${solvingGroup ? 'opacity-50 pointer-events-none' : ''}`}
            >
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
                icon="/icons/buttons/submit.svg"
                label="Submit"
                onClick={handleSubmit}
                disabled={selectedMovies.length !== REEL_CONFIG.GROUP_SIZE || !!solvingGroup}
              />
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-4 sm:mt-8 space-y-3 sm:space-y-4">
            <p className="text-white/80 text-xs sm:text-sm font-medium">
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
            <p className="text-white/30 text-[10px] sm:text-xs">
              © 2025 Good Vibes Games |{' '}
              <a href="/privacypolicy" className="hover:text-white/50 transition-colors">
                Privacy Policy
              </a>{' '}
              |{' '}
              <a href="/terms" className="hover:text-white/50 transition-colors">
                Terms of Use
              </a>
            </p>
          </div>
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
      <PosterModal movie={enlargedMovie} onClose={() => setEnlargedMovie(null)} />
    </div>
  );
};

export default ReelConnectionsGame;
