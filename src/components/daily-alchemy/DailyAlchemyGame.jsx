'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import { SOUP_GAME_STATES } from '@/lib/daily-alchemy.constants';
import { useDailyAlchemyGame } from '@/hooks/useDailyAlchemyGame';
import { useAlchemyCoop } from '@/hooks/useAlchemyCoop';
import { playPartnerElementSound } from '@/lib/sounds';
import { DailyAlchemyWelcomeScreen } from './DailyAlchemyWelcomeScreen';
import { DailyAlchemyGameScreen } from './DailyAlchemyGameScreen';
import { DailyAlchemyCompleteScreen } from './DailyAlchemyCompleteScreen';
import { DailyAlchemyGameOverScreen } from './DailyAlchemyGameOverScreen';
import { DailyAlchemyLoadingSkeleton } from './DailyAlchemyLoadingSkeleton';
import { DailyAlchemyBackground } from './DailyAlchemyBackground';
import { CoopLobbyScreen } from './CoopLobbyScreen';
import { SavesModal } from './SavesModal';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import AuthModal from '@/components/auth/AuthModal';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import AlchemyTutorialModal from './AlchemyTutorialModal';
import HintTutorialBanner from '@/components/shared/HintTutorialBanner';
import FavoritesTutorialBanner from '@/components/shared/FavoritesTutorialBanner';
import ServiceOutage from '@/components/shared/ServiceOutage';
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
  const { lightTap } = useHaptics();
  const { user, userProfile, serviceUnavailable } = useAuth();

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
  const [showAnonymousUpgrade, setShowAnonymousUpgrade] = useState(false);

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
    coopMode,
    startCoopMode,
    startCoopDailyMode,
    handleGameOver,
    addPartnerElement,

    // Favorites
    favoriteElements,
    toggleFavorite,
    clearAllFavorites,
    showFavoritesPanel,
    setShowFavoritesPanel,
    maxFavorites,

    // Auth
    isAnonymous,

    // Helpers
    formattedDate,
    targetElement,
    targetEmoji,
    parMoves,
  } = useDailyAlchemyGame(initialDate);

  // Co-op lobby state — declared before useAlchemyCoop so onPartnerJoined can reference it
  const [isInCoopLobby, setIsInCoopLobby] = useState(false);
  const coopElementBankRef = useRef(null); // Stores session element bank for host
  const coopHostFavoritesRef = useRef(null); // Stores host favorites from save slot
  const coopStartedRef = useRef(false); // Guard against duplicate startCoopMode calls
  const coopModeTypeRef = useRef('creative'); // 'daily' | 'creative' — tracks host's mode choice

  // Co-op hook
  const coop = useAlchemyCoop({
    enabled: coopMode,
    user,
    userProfile,
    onPartnerElement: useCallback(
      (element) => {
        addPartnerElement(element);
        playPartnerElementSound();
      },
      [addPartnerElement]
    ),
    onSessionEnded: useCallback(() => {
      // Partner left — stay in game but they'll see "disconnected" status
    }, []),
    onPartnerJoined: useCallback(
      (_partnerPresence) => {
        // Partner joined the lobby — start co-op gameplay for the host
        // Guard with ref to prevent duplicate startCoopMode from rapid presence events
        if (isInCoopLobby && !coopStartedRef.current) {
          coopStartedRef.current = true;
          setIsInCoopLobby(false);
          if (coopModeTypeRef.current === 'daily') {
            startCoopDailyMode();
          } else {
            startCoopMode(coopElementBankRef.current, coopHostFavoritesRef.current);
          }
        }
      },
      [isInCoopLobby, startCoopMode, startCoopDailyMode]
    ),
    onPartnerGameOver: useCallback(() => {
      // Partner's timer ran out in daily co-op — trigger local game over
      handleGameOver();
    }, [handleGameOver]),
  });

  // Co-op: Handle creating a session
  const handleCoopCreate = useCallback(
    async (saveSlot, sessionMode = 'creative') => {
      coopModeTypeRef.current = sessionMode;
      const result = await coop.createSession(saveSlot, sessionMode);
      if (result) {
        // Store element bank and favorites so host can access them when partner joins
        coopElementBankRef.current = result.elementBank || null;
        coopHostFavoritesRef.current = result.hostFavorites || null;
      }
      return result;
    },
    [coop]
  );

  // Co-op: Handle joining a session
  const handleCoopJoin = useCallback(
    async (inviteCode) => {
      const result = await coop.joinSession(inviteCode);
      if (result) {
        // Start co-op gameplay — mode determined by host's session
        setIsInCoopLobby(false);
        if (result.mode === 'daily') {
          startCoopDailyMode();
        } else {
          startCoopMode(result.elementBank);
        }
        return result;
      }
      return null;
    },
    [coop, startCoopMode, startCoopDailyMode]
  );

  // Co-op: Handle leaving
  const handleCoopLeave = useCallback(async () => {
    await coop.leaveSession();
    coopElementBankRef.current = null;
    // Return to welcome screen (reload page for clean state)
    if (isStandaloneAlchemy) {
      window.location.href = '/daily-alchemy';
    } else {
      window.location.reload();
    }
  }, [coop]);

  const handleEnterCoopLobby = useCallback(() => {
    coopStartedRef.current = false;
    setIsInCoopLobby(true);
  }, []);

  const handleExitCoopLobby = useCallback(() => {
    setIsInCoopLobby(false);
    coopElementBankRef.current = null;
    coopStartedRef.current = false;
    coop.leaveSession();
  }, [coop]);

  // Co-op: Broadcast new element discoveries to partner
  useEffect(() => {
    if (coopMode && lastResult && lastResult.isNew) {
      coop.broadcastNewElement(
        {
          name: lastResult.element,
          emoji: lastResult.emoji,
          isFirstDiscovery: lastResult.isFirstDiscovery,
        },
        lastResult.from
      );
    }
  }, [coopMode, lastResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Co-op daily: Broadcast game over to partner when local timer expires
  useEffect(() => {
    if (coopMode && !freePlayMode && gameState === SOUP_GAME_STATES.GAME_OVER) {
      coop.broadcastGameOver();
    }
  }, [coopMode, freePlayMode, gameState]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [savesModalSaveOnly, setSavesModalSaveOnly] = useState(false);

  const handleOpenSavesModal = useCallback(async () => {
    setSavesModalSaveOnly(false);
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

  // Co-op save: open saves modal in save-only mode
  const handleOpenCoopSave = useCallback(async () => {
    setSavesModalSaveOnly(true);
    await loadSlotSummaries();
    setShowSavesModal(true);
  }, [loadSlotSummaries]);

  // Co-op save: save current game state to a slot
  const handleCoopSlotSave = useCallback(
    async (slotNumber) => {
      return await coop.saveSession(slotNumber, {
        elementBank,
        totalMoves: movesCount,
        totalDiscoveries: elementBank.length - 4, // minus 4 starters
        firstDiscoveries,
        firstDiscoveryElements,
        favorites: [...favoriteElements],
      });
    },
    [coop, elementBank, movesCount, firstDiscoveries, firstDiscoveryElements, favoriteElements]
  );

  // Render based on game state
  if (serviceUnavailable) {
    return <ServiceOutage />;
  }

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
        className="fixed inset-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <DailyAlchemyBackground />
        {/* Main game card - pt-4 for web, pt-safe-ios for iOS notch */}
        {/* Desktop: wider container for side-by-side layout */}
        <div className="flex-1 flex flex-col max-w-md lg:max-w-4xl xl:max-w-5xl w-full mx-auto">
          <div className="flex-1 flex flex-col mx-4 mb-4 min-h-0">
            {/* Header - back button, title/date, and hamburger menu */}
            <header className="pt-3 pb-1 px-3 sm:px-5 flex items-center justify-between flex-shrink-0">
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
                {gameState === SOUP_GAME_STATES.WELCOME && !isInCoopLobby && (
                  <DailyAlchemyWelcomeScreen
                    formattedDate={formattedDate}
                    targetElement={targetElement}
                    targetEmoji={targetEmoji}
                    parMoves={parMoves}
                    onStart={startGame}
                    onStartFreePlay={startFreePlay}
                    onStartCoop={handleEnterCoopLobby}
                    onOpenHowToPlay={() => setShowHowToPlay(true)}
                    isArchive={isArchive}
                    puzzleNumber={puzzle?.number}
                    hasSavedProgress={hasSavedProgress}
                    onResume={resumeGame}
                  />
                )}

                {/* Co-op Lobby Screen */}
                {gameState === SOUP_GAME_STATES.WELCOME && isInCoopLobby && (
                  <CoopLobbyScreen
                    onCreateSession={handleCoopCreate}
                    onJoinSession={handleCoopJoin}
                    onCancel={handleExitCoopLobby}
                    inviteCode={coop.inviteCode}
                    isWaiting={coop.isWaiting}
                    isConnected={coop.isConnected}
                    error={coop.error}
                    onClearError={coop.clearError}
                    slotSummaries={slotSummaries}
                    onLoadSlotSummaries={loadSlotSummaries}
                    targetElement={targetElement}
                    targetEmoji={targetEmoji}
                    parMoves={parMoves}
                    isArchive={isArchive}
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
                      // Co-op props
                      coopMode={coopMode}
                      coopPartner={coop.partner}
                      coopPartnerStatus={coop.partnerStatus}
                      coopReceivedEmote={coop.receivedEmote}
                      onCoopSendEmote={coop.sendEmote}
                      coopEmoteCooldownActive={coop.emoteCooldownActive}
                      onCoopSave={handleOpenCoopSave}
                      onCoopLeave={handleCoopLeave}
                      // Anonymous auth
                      isAnonymous={isAnonymous}
                      onSignUpCTA={() => setShowAnonymousUpgrade(true)}
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
        saveOnly={savesModalSaveOnly}
        onSaveToSlot={handleCoopSlotSave}
      />

      {/* Anonymous user upgrade modal - shown when anonymous user clicks "Sign Up to Claim" on first discovery */}
      <AuthModal
        isOpen={showAnonymousUpgrade}
        onClose={() => setShowAnonymousUpgrade(false)}
        initialMode="signup"
        onSuccess={() => setShowAnonymousUpgrade(false)}
        initialMessage="Create an account to save your discoveries"
        initialMessageType="success"
      />
    </>
  );
}

export default DailyAlchemyGame;
