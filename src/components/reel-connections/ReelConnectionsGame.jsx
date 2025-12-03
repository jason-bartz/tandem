'use client';

import React, { useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useReelConnectionsGame } from '@/hooks/useReelConnectionsGame';
import { REEL_CONFIG } from '@/lib/reel-connections.constants';
import {
  HowToPlayModal,
  AboutModal,
  StatsModal,
  ArchiveModal,
  ReelConnectionsAuthModal,
} from './modals';
import ReelConnectionsLoadingSkeleton from './ReelConnectionsLoadingSkeleton';

const ReelConnectionsGame = () => {
  // Modal states
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    user,
    toggleMovieSelection,
    handleSubmit,
    handleShuffle,
    handleDeselect,
    resetGame,
    handleArchiveSelect,
    handleStartGame,
    handleShare,
    isSelected,
    isSolved,
    formatTime,
  } = useReelConnectionsGame();

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

  // Game complete screen
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
              <p className="text-white font-black text-xl mb-1 drop-shadow">
                {mistakes}/{REEL_CONFIG.MAX_MISTAKES}
              </p>
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

            <button
              onClick={() => setShowStats(true)}
              className="w-full py-4 bg-[#cb6ce6] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:shadow-[0px_0px_0px_rgba(0,0,0,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-white font-black text-lg capitalize tracking-wide hover:brightness-110"
            >
              Stats & Leaderboard
            </button>

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

        <div className="mt-auto pt-8 text-center space-y-2">
          <button
            onClick={() => setShowAbout(true)}
            className="text-white/50 hover:text-[#ffce00] text-sm font-medium transition-colors"
          >
            About
          </button>
          <p className="text-white/30 text-xs">© 2025 Good Vibes Games</p>
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
        <ReelConnectionsAuthModal
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

  // Main game screen
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
                {REEL_CONFIG.MAX_MISTAKES - mistakes} mistake
                {REEL_CONFIG.MAX_MISTAKES - mistakes !== 1 ? 's' : ''} left
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
          <div className="relative">
            {/* Movie Grid */}
            <div
              className={`grid grid-cols-4 gap-3 mb-6 transition-all duration-300 ${shakeGrid ? 'animate-error-shake' : ''} ${!gameStarted ? 'blur-md pointer-events-none select-none' : ''}`}
            >
              {movies.map((movie) => {
                const selected = isSelected(movie);
                const orderNumber = selected
                  ? selectedMovies.findIndex((m) => m.imdbId === movie.imdbId) + 1
                  : null;
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
              disabled={selectedMovies.length !== REEL_CONFIG.GROUP_SIZE}
              className={`flex items-center gap-2 px-6 py-3 border-[4px] rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform transition-all font-bold text-sm ${
                selectedMovies.length === REEL_CONFIG.GROUP_SIZE
                  ? 'cinema-gradient border-[#ffce00] text-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] active:translate-y-0 active:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] gold-glow'
                  : 'bg-white/5 border-white/20 text-white/30 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Submit
            </button>
          </div>
        )}

        {/* Footer */}
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
