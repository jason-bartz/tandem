'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { SOUP_GAME_STATES } from '@/lib/daily-alchemy.constants';
import { useDailyAlchemyGame } from '@/hooks/useDailyAlchemyGame';
import { DailyAlchemyWelcomeScreen } from './DailyAlchemyWelcomeScreen';
import { DailyAlchemyGameScreen } from './DailyAlchemyGameScreen';
import { DailyAlchemyCompleteScreen } from './DailyAlchemyCompleteScreen';
import { DailyAlchemyGameOverScreen } from './DailyAlchemyGameOverScreen';
import { DailyAlchemyLoadingSkeleton } from './DailyAlchemyLoadingSkeleton';
import { DailyAlchemyBackground } from './DailyAlchemyBackground';
import { SavesModal } from './SavesModal';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import AlchemyTutorialModal from './AlchemyTutorialModal';
import HintTutorialBanner from '@/components/shared/HintTutorialBanner';
import FavoritesTutorialBanner from '@/components/shared/FavoritesTutorialBanner';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';
import { isStandaloneAlchemy, homePath } from '@/lib/standalone';

/**
 * Error display component
 */
function ErrorDisplay({ error, onGoBack }) {
  const { highContrast } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <div className="mb-6">
        <Image
          src="/game/tandem/asleep.png"
          alt="Puzzlemaster asleep"
          width={120}
          height={120}
          className="mx-auto"
        />
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
      <button
        onClick={onGoBack}
        className={cn(
          'flex items-center gap-2 px-6 py-3',
          'bg-soup-primary text-white',
          'border-[3px] border-black',
          'rounded-xl font-bold',
          'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
          'hover:bg-soup-hover',
          'hover:translate-y-[-1px]',
          'active:translate-y-0 active:shadow-none',
          'transition-all duration-150',
          highContrast && 'border-[4px]'
        )}
      >
        <span>Go Back</span>
      </button>
    </div>
  );
}

/**
 * DailyAlchemyGame - Main game container component
 */
export function DailyAlchemyGame({ initialDate = null }) {
  const router = useRouter();
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSavesModal, setShowSavesModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const {
    // State
    gameState,
    puzzle,
    loading,
    error,
    isArchive,

    // Element bank
    elementBank,
    sortedElementBank,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,

    // Selection
    selectedA,
    selectedB,
    selectElement,
    selectResultElement,
    clearSelections,
    activeSlot,
    setActiveSlot,

    // Operator mode
    isSubtractMode,
    toggleOperatorMode,

    // Combination
    isCombining,
    isAnimating,
    combineElements,
    lastResult,
    clearLastResult,
    combinationPath,
    combinationError,

    // Timer
    elapsedTime,
    remainingTime,
    formatTime,
    pauseTimer,
    resumeTimer,

    // Stats
    movesCount,
    firstDiscoveries,
    firstDiscoveryElements,
    recentElements,

    // Completion
    isComplete,
    completionStats,
    getShareText,

    // Actions
    startGame,
    startFreePlay,
    resetGame,
    resumeGame,
    hasSavedProgress,

    // Creative Mode autosave
    isAutoSaving,
    autoSaveComplete,

    // Multi-slot Creative Mode
    activeSaveSlot,
    slotSummaries,
    loadSlotSummaries,
    switchSlot,
    renameSlot,
    clearSlot,
    exportSlot,
    importSlot,
    isSlotSwitching,

    // Hints
    hintsUsed,
    useHint,
    currentHintMessage,
    clearHintMessage,

    // Solution path (for reveal on game over)
    solutionPath,

    // Mode
    freePlayMode,

    // Favorites
    favoriteElements,
    toggleFavorite,
    clearAllFavorites,
    showFavoritesPanel,
    setShowFavoritesPanel,
    maxFavorites,

    // Helpers
    formattedDate,
    targetElement,
    targetEmoji,
    parMoves,
  } = useDailyAlchemyGame(initialDate);

  // Pause timer when sidebar or modals are open, resume when closed
  const isAnyModalOpen =
    isSidebarOpen ||
    showStats ||
    showArchive ||
    showHowToPlay ||
    showSettings ||
    showFeedback ||
    showSavesModal ||
    (showTutorial && !freePlayMode);

  useEffect(() => {
    if (isAnyModalOpen) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [isAnyModalOpen, pauseTimer, resumeTimer]);

  // Saves modal handlers
  const handleOpenSavesModal = useCallback(async () => {
    await loadSlotSummaries();
    setShowSavesModal(true);
  }, [loadSlotSummaries]);

  const handleSwitchSlot = useCallback(
    async (slotNumber) => {
      await switchSlot(slotNumber);
      setShowSavesModal(false);
    },
    [switchSlot]
  );

  // Render based on game state
  if (loading) {
    return <DailyAlchemyLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <DailyAlchemyBackground />
        <div className="max-w-md w-full">
          <ErrorDisplay error={error} onGoBack={() => router.push(homePath)} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 flex flex-col overflow-hidden',
          isStandaloneAlchemy && 'bg-white dark:bg-gray-900'
        )}
        style={isStandaloneAlchemy ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
      >
        {/* Background - green on main site, white on standalone */}
        <DailyAlchemyBackground />
        {/* Main game card - pt-4 for web, pt-safe-ios for iOS notch */}
        {/* Desktop: wider container for side-by-side layout */}
        <div
          className={cn(
            'flex-1 flex flex-col max-w-md lg:max-w-4xl xl:max-w-5xl w-full mx-auto',
            !isStandaloneAlchemy && 'pt-4 pt-safe-ios'
          )}
        >
          <div
            className={cn(
              'flex-1 flex flex-col mx-4 mb-4 min-h-0',
              isStandaloneAlchemy
                ? 'rounded-none border-0'
                : cn(
                    'rounded-[32px] border-[3px]',
                    highContrast
                      ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                      : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                  )
            )}
          >
            {/* Header - back button, title/date, and hamburger menu */}
            <header
              className={cn(
                'pt-2 pb-1 px-3 sm:px-5 flex items-center justify-between flex-shrink-0',
                isStandaloneAlchemy
                  ? 'pt-3'
                  : cn(
                      'rounded-t-[29px]',
                      highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-bg-card'
                    )
              )}
            >
              {/* Back button - hidden on standalone welcome (no page to go back to) */}
              {isStandaloneAlchemy && gameState === SOUP_GAME_STATES.WELCOME ? (
                <div className="w-8 h-8 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => {
                    lightTap();
                    if (isStandaloneAlchemy) {
                      window.location.href = '/daily-alchemy';
                    } else {
                      router.push('/');
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                  title="Back to Home"
                >
                  <svg
                    className="w-5 h-5 text-gray-600 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}

              {/* Center content - Title and date */}
              <div className="flex-1 flex flex-col items-center">
                {(isStandaloneAlchemy && gameState === SOUP_GAME_STATES.WELCOME) || freePlayMode ? (
                  <div className="flex items-center gap-2">
                    <Image src="/ui/games/daily-alchemy.png" alt="" width={24} height={24} />
                    <span className="text-gray-800 dark:text-gray-200 text-lg font-lilita-one font-semibold">
                      Daily Alchemy
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    {`Daily Puzzle ${formattedDate}`}
                  </span>
                )}
              </div>

              {/* Hamburger menu */}
              <div className="flex-shrink-0">
                <HamburgerMenu
                  isOpen={isSidebarOpen}
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              </div>
            </header>

            {/* Content Area - relative/absolute pattern for iOS scroll fix */}
            <div className="relative flex-1 min-h-0">
              <div className="absolute inset-0 p-4 sm:p-6 overflow-y-auto overflow-x-hidden scrollable">
                {/* Welcome Screen */}
                {gameState === SOUP_GAME_STATES.WELCOME && (
                  <DailyAlchemyWelcomeScreen
                    formattedDate={formattedDate}
                    targetElement={targetElement}
                    targetEmoji={targetEmoji}
                    parMoves={parMoves}
                    onStart={startGame}
                    onStartFreePlay={startFreePlay}
                    onOpenHowToPlay={() => setShowHowToPlay(true)}
                    isArchive={isArchive}
                    puzzleNumber={puzzle?.number}
                    hasSavedProgress={hasSavedProgress}
                    onResume={resumeGame}
                  />
                )}

                {/* Active Gameplay - wrapped in flex container for h-full to work */}
                {(gameState === SOUP_GAME_STATES.PLAYING ||
                  gameState === SOUP_GAME_STATES.ADMIRE) && (
                  <div className="flex flex-col h-full">
                    <DailyAlchemyGameScreen
                      targetElement={targetElement}
                      targetEmoji={targetEmoji}
                      parMoves={parMoves}
                      remainingTime={remainingTime}
                      movesCount={movesCount}
                      formatTime={formatTime}
                      elementBank={elementBank}
                      sortedElementBank={sortedElementBank}
                      sortOrder={sortOrder}
                      setSortOrder={setSortOrder}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      selectedA={selectedA}
                      selectedB={selectedB}
                      selectElement={selectElement}
                      selectResultElement={selectResultElement}
                      clearSelections={clearSelections}
                      activeSlot={activeSlot}
                      setActiveSlot={setActiveSlot}
                      isSubtractMode={isSubtractMode}
                      toggleOperatorMode={toggleOperatorMode}
                      isCombining={isCombining}
                      isAnimating={isAnimating}
                      combineElements={combineElements}
                      lastResult={lastResult}
                      clearLastResult={clearLastResult}
                      recentElements={recentElements}
                      firstDiscoveryElements={firstDiscoveryElements}
                      isComplete={isComplete || gameState === SOUP_GAME_STATES.ADMIRE}
                      freePlayMode={freePlayMode}
                      combinationError={combinationError}
                      onUseHint={useHint}
                      currentHintMessage={currentHintMessage}
                      onClearHintMessage={clearHintMessage}
                      // Creative Mode saves
                      onOpenSavesModal={handleOpenSavesModal}
                      isAutoSaving={isAutoSaving}
                      autoSaveComplete={autoSaveComplete}
                      isSlotSwitching={isSlotSwitching}
                      // Favorites props
                      favoriteElements={favoriteElements}
                      onToggleFavorite={toggleFavorite}
                      onClearAllFavorites={clearAllFavorites}
                      showFavoritesPanel={showFavoritesPanel}
                      onToggleFavoritesPanel={() => setShowFavoritesPanel(!showFavoritesPanel)}
                      maxFavorites={maxFavorites}
                    />
                  </div>
                )}

                {/* Complete Screen */}
                {gameState === SOUP_GAME_STATES.COMPLETE && (
                  <DailyAlchemyCompleteScreen
                    targetElement={targetElement}
                    targetEmoji={targetEmoji}
                    elapsedTime={elapsedTime}
                    movesCount={movesCount}
                    parMoves={parMoves}
                    firstDiscoveries={firstDiscoveries}
                    firstDiscoveryElements={firstDiscoveryElements}
                    completionStats={completionStats}
                    winningCombination={combinationPath.find(
                      (step) => step.result?.toLowerCase() === targetElement?.toLowerCase()
                    )}
                    onShare={getShareText}
                    onPlayAgain={resetGame}
                    onStartFreePlay={startFreePlay}
                    onViewArchive={() => setShowArchive(true)}
                    isArchive={isArchive}
                    hintsUsed={hintsUsed}
                  />
                )}

                {/* Game Over Screen (time ran out) */}
                {gameState === SOUP_GAME_STATES.GAME_OVER && (
                  <DailyAlchemyGameOverScreen
                    targetElement={targetElement}
                    targetEmoji={targetEmoji}
                    completionStats={completionStats}
                    onStartFreePlay={startFreePlay}
                    onViewArchive={() => setShowArchive(true)}
                    solutionPath={solutionPath}
                  />
                )}
              </div>
            </div>
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
        onOpenFeedback={() => setShowFeedback(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
      />

      {/* Tutorial Modal - shown on first visit when gameplay starts (daily mode only) */}
      {(gameState === SOUP_GAME_STATES.PLAYING || gameState === SOUP_GAME_STATES.ADMIRE) &&
        !freePlayMode && <AlchemyTutorialModal onClose={() => setShowTutorial(false)} />}

      {/* Hint Tutorial Banner - shows after Learn to Play is dismissed, before first hint use */}
      {(gameState === SOUP_GAME_STATES.PLAYING || gameState === SOUP_GAME_STATES.ADMIRE) &&
        !freePlayMode && <HintTutorialBanner gameType="soup" hasUsedHint={hintsUsed > 0} />}

      {/* Favorites Tutorial Banner - shows 30s after gameplay starts or 30s after hint tutorial dismissed */}
      {(gameState === SOUP_GAME_STATES.PLAYING || gameState === SOUP_GAME_STATES.ADMIRE) && (
        <FavoritesTutorialBanner
          gameType="soup"
          isPlaying={
            gameState === SOUP_GAME_STATES.PLAYING || gameState === SOUP_GAME_STATES.ADMIRE
          }
        />
      )}

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          router.push(`/daily-alchemy?date=${date}`);
        }}
        defaultTab="soup"
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        defaultTab="soup"
      />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        initialGame="soup"
        initialTab="daily"
      />
      <SavesModal
        isOpen={showSavesModal}
        onClose={() => setShowSavesModal(false)}
        slotSummaries={slotSummaries}
        activeSaveSlot={activeSaveSlot}
        onSwitchSlot={handleSwitchSlot}
        onRenameSlot={renameSlot}
        onClearSlot={clearSlot}
        onExportSlot={exportSlot}
        onImportSlot={importSlot}
        isSlotSwitching={isSlotSwitching}
      />
    </>
  );
}

export default DailyAlchemyGame;
