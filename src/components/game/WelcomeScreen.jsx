'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentPuzzleNumber } from '@/lib/puzzleNumber';
import { getCurrentMiniPuzzleInfo } from '@/lib/miniUtils';
import { getCurrentReelPuzzleNumber, getLocalDateString } from '@/lib/reelConnectionsUtils';
import { SOUP_STORAGE_KEYS } from '@/lib/daily-alchemy.constants';
import { playStartSound } from '@/lib/sounds';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from './UnifiedArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import Header from '@/components/navigation/Header';
import Greeting from '@/components/home/Greeting';
import GameCard from '@/components/home/GameCard';
import Footer from '@/components/home/Footer';
import AboutSection from '@/components/home/AboutSection';
import PaywallModal from '@/components/PaywallModal';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Capacitor } from '@capacitor/core';
import { getPuzzleResult } from '@/lib/storage';
import { loadMiniPuzzleProgress } from '@/lib/miniStorage';
import miniService from '@/services/mini.service';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';
import { trackGameCardClick, GAME_TYPES } from '@/lib/gameAnalytics';

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
  const [showPaywall, setShowPaywall] = useState(false);
  const { welcomeMelody } = useHaptics();
  const { highContrast } = useTheme();

  // Loading and completion states
  const [tandemCompleted, setTandemCompleted] = useState(false);
  const [miniCompleted, setMiniCompleted] = useState(false);
  const [soupCompleted, setSoupCompleted] = useState(false);
  const [reelCompleted, setReelCompleted] = useState(false);
  const [tandemPlayed, setTandemPlayed] = useState(false);
  const [miniPlayed, setMiniPlayed] = useState(false);
  const [soupPlayed, setSoupPlayed] = useState(false);
  const [reelPlayed, setReelPlayed] = useState(false);
  const [miniLoading, setMiniLoading] = useState(true);
  const [soupLoading, setSoupLoading] = useState(true);
  const [reelLoading, setReelLoading] = useState(true);
  const [miniPuzzle, setMiniPuzzle] = useState(null);
  const [soupPuzzle, setSoupPuzzle] = useState(null);
  const [reelPuzzle, setReelPuzzle] = useState(null);

  // Track if welcome sound has been played this session (persists across navigations)
  const hasPlayedWelcomeSound = useRef(false);

  // Load completion status for all games
  useEffect(() => {
    const loadCompletionStatus = async () => {
      try {
        // Check Tandem completion
        if (puzzle?.date) {
          const result = await getPuzzleResult(puzzle.date);
          setTandemPlayed(!!result);
          setTandemCompleted(result?.won || false);
        }

        // Load Mini, Soup, and Reel data in parallel for faster loading
        const [
          miniProgressResult,
          miniPuzzleResult,
          soupProgressResult,
          soupPuzzleResult,
          reelStatsResult,
          reelPuzzleResult,
        ] = await Promise.allSettled([
          loadMiniPuzzleProgress(miniPuzzleInfo.isoDate),
          miniService.getPuzzle(miniPuzzleInfo.isoDate),
          storageService.get(`${SOUP_STORAGE_KEYS.PUZZLE_PROGRESS}${getLocalDateString()}`),
          fetch(`/api/daily-alchemy/puzzle?date=${getLocalDateString()}`).then((res) => res.json()),
          storageService.get('reel-connections-stats'),
          fetch(`/api/reel-connections/puzzle?date=${getLocalDateString()}`).then((res) =>
            res.json()
          ),
        ]);

        // Process Mini completion and puzzle data
        if (miniProgressResult.status === 'fulfilled') {
          const miniProgress = miniProgressResult.value;
          setMiniPlayed(!!miniProgress);
          setMiniCompleted(miniProgress?.completed || false);
        }

        if (
          miniPuzzleResult.status === 'fulfilled' &&
          miniPuzzleResult.value?.success &&
          miniPuzzleResult.value?.puzzle
        ) {
          setMiniPuzzle(miniPuzzleResult.value.puzzle);
        }
        setMiniLoading(false);

        // Process Daily Alchemy completion and puzzle data
        if (soupProgressResult.status === 'fulfilled' && soupProgressResult.value) {
          const soupProgress = JSON.parse(soupProgressResult.value);
          setSoupPlayed(!!soupProgress);
          setSoupCompleted(soupProgress?.completed || false);
        }

        if (soupPuzzleResult.status === 'fulfilled' && soupPuzzleResult.value?.puzzle) {
          setSoupPuzzle(soupPuzzleResult.value.puzzle);
        }
        setSoupLoading(false);

        // Process Reel Connections completion and puzzle data
        if (reelStatsResult.status === 'fulfilled' && reelStatsResult.value) {
          const parsed = JSON.parse(reelStatsResult.value);
          const today = getLocalDateString();
          const todayGame = parsed.gameHistory?.find((g) => g.date === today);
          setReelPlayed(!!todayGame);
          setReelCompleted(todayGame?.won || false);
        }

        if (reelPuzzleResult.status === 'fulfilled' && reelPuzzleResult.value?.puzzle) {
          setReelPuzzle(reelPuzzleResult.value.puzzle);
        }
        setReelLoading(false);
      } catch (err) {
        logger.error('Failed to load completion status', err);
        setMiniLoading(false);
        setSoupLoading(false);
        setReelLoading(false);
      }
    };

    loadCompletionStatus();
  }, [puzzle?.date, miniPuzzleInfo.isoDate]);

  // Play welcome sound on native app (only on initial app open, not on navigation back)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !hasPlayedWelcomeSound.current) {
      hasPlayedWelcomeSound.current = true;
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
    trackGameCardClick(GAME_TYPES.TANDEM, tandemPuzzleNumber, puzzle?.date);
    if (tandemCompleted && puzzle?.date) {
      onSelectPuzzle(puzzle.date);
    } else {
      onStart();
    }
  };

  const handleMiniClick = () => {
    trackGameCardClick(
      GAME_TYPES.MINI,
      miniPuzzle?.number || miniPuzzleInfo.number,
      miniPuzzleInfo.isoDate
    );
    router.push('/dailymini');
  };

  const handleSoupClick = () => {
    trackGameCardClick(GAME_TYPES.ALCHEMY, soupPuzzle?.number || 1, getLocalDateString());
    router.push('/daily-alchemy');
  };

  const handleReelClick = () => {
    trackGameCardClick(
      GAME_TYPES.REEL,
      reelPuzzle?.number || reelPuzzleNumber,
      getLocalDateString()
    );
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
          <Greeting
            tandemCompleted={tandemCompleted}
            miniCompleted={miniCompleted}
            soupCompleted={soupCompleted}
            reelCompleted={reelCompleted}
            tandemPlayed={tandemPlayed}
            miniPlayed={miniPlayed}
            soupPlayed={soupPlayed}
            reelPlayed={reelPlayed}
            isLoading={!puzzle || miniLoading || soupLoading || reelLoading}
          />

          {/* Game Cards */}
          <div className="space-y-4">
            {/* Daily Tandem */}
            <GameCard
              icon="/icons/ui/tandem.png"
              title="Daily Tandem"
              description="Decipher four emoji pairs that share a hidden theme."
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

            {/* Daily Alchemy */}
            <GameCard
              icon="/icons/ui/daily-alchemy.png"
              title="Daily Alchemy"
              description="Combine elements to discover today's target."
              puzzleNumber={soupPuzzle?.number || 1}
              onClick={handleSoupClick}
              loading={soupLoading}
              completed={soupCompleted}
              completedMessage="You created today's element"
              animationDelay={0.15}
              showNewBadge
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
              animationDelay={0.25}
            />
          </div>

          {/* About Section */}
          <AboutSection onSubscribe={() => setShowPaywall(true)} />
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
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}
