'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCurrentPuzzleNumber } from '@/lib/puzzleNumber';
import { getCurrentMiniPuzzleInfo } from '@/lib/miniUtils';
import { getCurrentReelPuzzleNumber, getLocalDateString } from '@/lib/reelConnectionsUtils';
import { SOUP_STORAGE_KEYS } from '@/lib/daily-alchemy.constants';
import { playTandemStartSound, playAllFourDoneFanfare } from '@/lib/sounds';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from './UnifiedArchiveCalendar';
import HowToPlayModal from './HowToPlayModal';
import Settings from '@/components/Settings';
import Header from '@/components/navigation/Header';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';
import Greeting from '@/components/home/Greeting';
import GameCard from '@/components/home/GameCard';
import Footer from '@/components/home/Footer';
import AboutSection from '@/components/home/AboutSection';
import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useHomeKeyboard } from '@/hooks/useHomeKeyboard';
import HomeKeyboardShortcutsModal from '@/components/home/HomeKeyboardShortcutsModal';
import FeedbackPane from '@/components/FeedbackPane';
import { Capacitor } from '@capacitor/core';
import { getPuzzleResult } from '@/lib/storage';
import { loadMiniPuzzleProgress } from '@/lib/miniStorage';
import { loadReelStats } from '@/lib/reelStorage';
import miniService from '@/services/mini.service';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';

// Module-level flag so it survives component unmount/remount during navigation
let _welcomeSoundPlayedThisSession = false;

export default function WelcomeScreen({
  onStart,
  _theme,
  _isAuto,
  _currentState,
  onSelectPuzzle,
  puzzle,
  tandemError = null,
}) {
  const router = useRouter();
  const tandemPuzzleNumber = getCurrentPuzzleNumber();
  const miniPuzzleInfo = getCurrentMiniPuzzleInfo();
  const reelPuzzleNumber = getCurrentReelPuzzleNumber();

  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTandemUnavailable, setShowTandemUnavailable] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
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
          capacitorFetch(
            getApiUrl(`/api/daily-alchemy/puzzle?date=${getLocalDateString()}`),
            {},
            false
          ).then((res) => res.json()),
          // Use canonical loader so signed-in users hit the per-user namespaced
          // key, and so we get the up-to-date merged stats from the database.
          loadReelStats({ skipDbFetch: true }),
          capacitorFetch(
            getApiUrl(`/api/reel-connections/puzzle?date=${getLocalDateString()}`),
            {},
            false
          ).then((res) => res.json()),
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
          // loadReelStats() always returns an object (never a JSON string).
          const parsed = reelStatsResult.value;
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

  // Play "All Four Done" fanfare when all games are completed (once per day)
  useEffect(() => {
    if (tandemCompleted && miniCompleted && soupCompleted && reelCompleted) {
      const today = new Date().toISOString().split('T')[0];
      const lastFanfare = localStorage.getItem('tandem_allFourFanfare');
      if (lastFanfare !== today) {
        localStorage.setItem('tandem_allFourFanfare', today);
        // Small delay to let the screen settle
        const timer = setTimeout(() => playAllFourDoneFanfare(), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [tandemCompleted, miniCompleted, soupCompleted, reelCompleted]);

  // Play welcome sound on native app (only on initial app open, not on navigation back)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !_welcomeSoundPlayedThisSession) {
      _welcomeSoundPlayedThisSession = true;
      const timer = setTimeout(() => {
        try {
          playTandemStartSound();
          welcomeMelody();
        } catch (e) {
          // Sound/haptics might fail on some devices
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [welcomeMelody]);

  const handleTandemClick = () => {
    if (tandemError) {
      setShowTandemUnavailable(true);
      return;
    }
    if (tandemCompleted && puzzle?.date) {
      onSelectPuzzle(puzzle.date);
    } else {
      onStart();
    }
  };

  const handleMiniClick = () => {
    router.push('/dailymini');
  };

  const handleSoupClick = () => {
    router.push('/daily-alchemy');
  };

  const handleReelClick = () => {
    router.push('/reel-connections');
  };

  const handleOpenFeedback = useCallback(() => {
    setIsSidebarOpen(false);
    setTimeout(() => setShowFeedback(true), 200);
  }, []);

  // Check if any modal is open (to suppress game shortcuts while a modal is visible)
  const hasOpenModal =
    showStats ||
    showArchive ||
    showHowToPlay ||
    showSettings ||
    showLeaderboard ||
    showTandemUnavailable ||
    showFeedback;

  const { showShortcuts: showHomeShortcuts, setShowShortcuts: setShowHomeShortcuts } =
    useHomeKeyboard({
      onTandemClick: handleTandemClick,
      onMiniClick: handleMiniClick,
      onAlchemyClick: handleSoupClick,
      onReelClick: handleReelClick,
      isSidebarOpen,
      setIsSidebarOpen,
      onOpenStats: () => setShowStats(true),
      onOpenArchive: () => setShowArchive(true),
      onOpenHowToPlay: () => setShowHowToPlay(true),
      onOpenSettings: () => setShowSettings(true),
      onOpenLeaderboard: () => setShowLeaderboard(true),
      onOpenFeedback: handleOpenFeedback,
      hasOpenModal,
    });

  return (
    <>
      <Header
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={setIsSidebarOpen}
        onOpenFeedback={handleOpenFeedback}
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
            isLoading={(!puzzle && !tandemError) || miniLoading || soupLoading || reelLoading}
          />

          {/* Announcement Banner */}
          <AnnouncementBanner />

          {/* Game Cards */}
          <ErrorBoundary
            name="GameCards"
            fallback={({ onReset }) => (
              <div className="text-center py-8 px-4 rounded-lg bg-bg-surface dark:bg-bg-card">
                <p className="text-text-primary font-bold mb-2">
                  Something went wrong loading games.
                </p>
                <button
                  onClick={onReset}
                  className="text-sm font-semibold text-accent-blue hover:underline"
                >
                  Try again
                </button>
              </div>
            )}
          >
            <div className="space-y-4">
              {/* Daily Tandem */}
              <GameCard
                icon="/ui/games/tandem.png"
                title="Daily Tandem"
                description="Decipher four emoji pairs that share a hidden theme."
                puzzleNumber={tandemPuzzleNumber}
                onClick={handleTandemClick}
                loading={!puzzle && !tandemError}
                unavailable={!!tandemError && !puzzle}
                completed={tandemCompleted}
                completedMessage="You discovered today's theme"
                animationDelay={0}
              />

              {/* Daily Mini */}
              <GameCard
                icon="/ui/games/mini.png"
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
                icon="/ui/games/daily-alchemy.png"
                title="Daily Alchemy"
                description="Combine elements to discover today's target, or play creative mode."
                puzzleNumber={soupPuzzle?.number || 1}
                onClick={handleSoupClick}
                loading={soupLoading}
                completed={soupCompleted}
                completedMessage="You created today's element"
                animationDelay={0.15}
              />

              {/* Reel Connections */}
              <GameCard
                icon="/ui/games/movie.png"
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
          </ErrorBoundary>

          {/* About Section */}
          <AboutSection />
        </div>

        {/* Footer - at bottom of page */}
        <div className="max-w-2xl w-full mx-auto px-4">
          <Footer />
        </div>
      </main>

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        initialGame="tandem"
        initialTab="daily"
      />
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
      {/* Feedback Pane */}
      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Keyboard shortcut hint — desktop only */}
      <div className="hidden lg:block">
        <button
          onClick={() => setShowHomeShortcuts(true)}
          className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-card dark:bg-gray-800 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
          aria-label="Show keyboard shortcuts"
        >
          <span>
            Press{' '}
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono font-medium border border-gray-300 dark:border-gray-600">
              ?
            </kbd>{' '}
            for keyboard shortcuts
          </span>
        </button>
      </div>

      {/* Home Keyboard Shortcuts Modal */}
      <HomeKeyboardShortcutsModal
        isOpen={showHomeShortcuts}
        onClose={() => setShowHomeShortcuts(false)}
      />

      {/* Tandem Unavailable Modal */}
      {showTandemUnavailable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowTandemUnavailable(false)}
        >
          <div
            className="bg-ghost-white dark:bg-gray-800 rounded-lg p-8 max-w-md text-center mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <Image
                src="/game/tandem/asleep.png"
                alt="Puzzlemaster asleep"
                width={120}
                height={120}
                className="mx-auto"
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{tandemError}</p>
            <button
              onClick={() => setShowTandemUnavailable(false)}
              className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
