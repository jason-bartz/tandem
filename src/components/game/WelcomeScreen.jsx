'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPuzzleNumber } from '@/lib/puzzleNumber';
import { getCurrentMiniPuzzleInfo } from '@/lib/miniUtils';
import { getCurrentReelPuzzleNumber, getLocalDateString } from '@/lib/reelConnectionsUtils';
import { playStartSound } from '@/lib/sounds';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from './UnifiedArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import Header from '@/components/navigation/Header';
import Greeting from '@/components/home/Greeting';
import GameCard from '@/components/home/GameCard';
import Footer from '@/components/home/Footer';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Capacitor } from '@capacitor/core';
import { getPuzzleResult } from '@/lib/storage';
import { loadMiniPuzzleProgress } from '@/lib/miniStorage';
import miniService from '@/services/mini.service';
import storageService from '@/core/storage/storageService';

export default function WelcomeScreen({
  onStart,
  _theme,
  _isAuto,
  _currentState,
  onSelectPuzzle,
  puzzle,
}) {
  const router = useRouter();
  const tandemPuzzleNumber = getCurrentPuzzleNumber();
  const miniPuzzleInfo = getCurrentMiniPuzzleInfo();
  const reelPuzzleNumber = getCurrentReelPuzzleNumber();

  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { welcomeMelody } = useHaptics();
  const { highContrast } = useTheme();

  // Loading and completion states
  const [tandemCompleted, setTandemCompleted] = useState(false);
  const [miniCompleted, setMiniCompleted] = useState(false);
  const [reelCompleted, setReelCompleted] = useState(false);
  const [miniLoading, setMiniLoading] = useState(true);
  const [reelLoading, setReelLoading] = useState(true);
  const [miniPuzzle, setMiniPuzzle] = useState(null);
  const [reelPuzzle, setReelPuzzle] = useState(null);

  // Load completion status for all games
  useEffect(() => {
    const loadCompletionStatus = async () => {
      try {
        // Check Tandem completion
        if (puzzle?.date) {
          const result = await getPuzzleResult(puzzle.date);
          setTandemCompleted(result?.won || false);
        }

        // Check Mini completion
        const miniProgress = await loadMiniPuzzleProgress(miniPuzzleInfo.isoDate);
        setMiniCompleted(miniProgress?.completed || false);

        // Load Mini puzzle
        const miniResponse = await miniService.getPuzzle(miniPuzzleInfo.isoDate);
        if (miniResponse.success && miniResponse.puzzle) {
          setMiniPuzzle(miniResponse.puzzle);
        }
        setMiniLoading(false);

        // Check Reel Connections completion (uses storageService for IndexedDB fallback)
        const reelStats = await storageService.get('reel-connections-stats');
        if (reelStats) {
          const parsed = JSON.parse(reelStats);
          const today = getLocalDateString();
          const todayGame = parsed.gameHistory?.find((g) => g.date === today);
          setReelCompleted(todayGame?.won || false);
        }

        // Load Reel puzzle
        const reelResponse = await fetch(
          `/api/reel-connections/puzzle?date=${getLocalDateString()}`
        );
        const reelData = await reelResponse.json();
        if (reelData.puzzle) {
          setReelPuzzle(reelData.puzzle);
        }
        setReelLoading(false);
      } catch (err) {
        console.error('Failed to load completion status:', err);
        setMiniLoading(false);
        setReelLoading(false);
      }
    };

    loadCompletionStatus();
  }, [puzzle?.date, miniPuzzleInfo.isoDate]);

  // Play welcome sound on native app
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => {
        try {
          playStartSound();
          welcomeMelody();
        } catch (e) {
          // Sound/haptics might fail on some devices
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [welcomeMelody]);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTandemClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, tandemCompleted, puzzle]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTandemClick = () => {
    if (tandemCompleted && puzzle?.date) {
      onSelectPuzzle(puzzle.date);
    } else {
      onStart();
    }
  };

  const handleMiniClick = () => {
    router.push('/dailymini');
  };

  const handleReelClick = () => {
    router.push('/reel-connections');
  };

  return (
    <>
      <Header
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main content with padding for fixed header */}
      <main
        className={`min-h-screen flex flex-col pt-[calc(70px+env(safe-area-inset-top))] pb-safe ${
          highContrast ? 'bg-hc-background' : 'bg-bg-primary dark:bg-bg-primary'
        }`}
      >
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
          {/* Greeting */}
          <Greeting />

          {/* Game Cards */}
          <div className="space-y-4">
            {/* Daily Tandem */}
            <GameCard
              icon="/icons/ui/tandem.png"
              title="Daily Tandem"
              description="Decipher four sets of emoji clues that share a hidden theme."
              puzzleNumber={tandemPuzzleNumber}
              onClick={handleTandemClick}
              loading={!puzzle}
              completed={tandemCompleted}
              completedMessage="You discovered today's theme"
              animationDelay={0}
            />

            {/* Daily Mini */}
            <GameCard
              icon="/icons/ui/mini.png"
              title="Daily Mini"
              description="Race the clock to solve this classic 5x5 crossword."
              puzzleNumber={miniPuzzle?.number || miniPuzzleInfo.number}
              onClick={handleMiniClick}
              loading={miniLoading}
              completed={miniCompleted}
              completedMessage="You solved today's puzzle"
              animationDelay={0.1}
            />

            {/* Reel Connections */}
            <GameCard
              icon="/icons/ui/movie.png"
              title="Reel Connections"
              description="Group movies that share a common theme."
              puzzleNumber={reelPuzzle?.number || reelPuzzleNumber}
              creator={reelPuzzle?.creator_name}
              onClick={handleReelClick}
              loading={reelLoading}
              completed={reelCompleted}
              completedMessage="You grouped all movies"
              animationDelay={0.2}
            />
          </div>
        </div>

        {/* Footer - at bottom of page */}
        <div className="max-w-2xl w-full mx-auto px-4">
          <Footer />
        </div>
      </main>

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(puzzleNumber) => {
          setShowArchive(false);
          setTimeout(() => {
            onSelectPuzzle(puzzleNumber);
          }, 100);
        }}
        defaultTab="tandem"
      />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
