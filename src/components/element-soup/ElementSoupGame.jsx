'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { SOUP_GAME_STATES } from '@/lib/element-soup.constants';
import { useElementSoupGame } from '@/hooks/useElementSoupGame';
import { ElementSoupWelcomeScreen } from './ElementSoupWelcomeScreen';
import { ElementSoupGameScreen } from './ElementSoupGameScreen';
import { ElementSoupCompleteScreen } from './ElementSoupCompleteScreen';
import { ElementSoupGameOverScreen } from './ElementSoupGameOverScreen';
import { ElementSoupLoadingSkeleton } from './ElementSoupLoadingSkeleton';
import { ElementSoupBackground } from './ElementSoupBackground';
import HamburgerMenu from '@/components/navigation/HamburgerMenu';
import SidebarMenu from '@/components/navigation/SidebarMenu';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import LearnToPlayBanner from '@/components/shared/LearnToPlayBanner';
import Settings from '@/components/Settings';
import FeedbackPane from '@/components/FeedbackPane';

/**
 * Error display component
 */
function ErrorDisplay({ error, onRetry }) {
  const { highContrast } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <AlertCircle className={cn('w-12 h-12 mb-4 text-red-500', highContrast && 'text-hc-error')} />
      <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Oops!</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
      <button
        onClick={onRetry}
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
        <RefreshCw className="w-5 h-5" />
        <span>Try Again</span>
      </button>
    </div>
  );
}

/**
 * ElementSoupGame - Main game container component
 */
export function ElementSoupGame({ initialDate = null }) {
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

  const {
    // State
    gameState,
    puzzle,
    loading,
    error,
    isArchive,

    // Element bank
    sortedElementBank,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,

    // Selection
    selectedA,
    selectedB,
    selectElement,
    clearSelections,

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
    loadPuzzle,
    resetGame,

    // Hints
    hintsRemaining,
    useHint,

    // Mode
    freePlayMode,

    // Helpers
    formattedDate,
    targetElement,
    targetEmoji,
    parMoves,
  } = useElementSoupGame(initialDate);

  // Render based on game state
  if (loading) {
    return <ElementSoupLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <ElementSoupBackground />
        <div className="max-w-md w-full">
          <ErrorDisplay error={error} onRetry={() => loadPuzzle(initialDate)} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('fixed inset-0 flex flex-col overflow-hidden')}>
        {/* Animated gradient background */}
        <ElementSoupBackground />
        {/* Main game card - pt-4 for web, pt-safe-ios for iOS notch */}
        <div className="flex-1 flex flex-col max-w-md w-full mx-auto pt-4 pt-safe-ios">
          <div
            className={cn(
              'rounded-[32px] border-[3px] flex-1 flex flex-col mx-4 mb-4 min-h-0',
              highContrast
                ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            )}
          >
            {/* Header - back button, title/date, and hamburger menu */}
            <header
              className={cn(
                'pt-2 pb-1 px-3 sm:px-5 flex items-center justify-between flex-shrink-0 rounded-t-[29px]',
                highContrast ? 'bg-hc-surface' : 'bg-ghost-white dark:bg-bg-card'
              )}
            >
              {/* Back button */}
              <button
                onClick={() => {
                  lightTap();
                  router.push('/');
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

              {/* Center content - Title and date */}
              <div className="flex-1 flex flex-col items-center">
                <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  {freePlayMode ? 'Free Play Mode' : `Daily Puzzle ${formattedDate}`}
                </span>
              </div>

              {/* Hamburger menu */}
              <div className="flex-shrink-0">
                <HamburgerMenu
                  isOpen={isSidebarOpen}
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                />
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-4 sm:p-6 min-h-0 overflow-y-auto overflow-x-hidden scrollable">
              {/* Welcome Screen */}
              {gameState === SOUP_GAME_STATES.WELCOME && (
                <ElementSoupWelcomeScreen
                  formattedDate={formattedDate}
                  targetElement={targetElement}
                  targetEmoji={targetEmoji}
                  parMoves={parMoves}
                  onStart={startGame}
                  onStartFreePlay={startFreePlay}
                  onOpenHowToPlay={() => setShowHowToPlay(true)}
                  isArchive={isArchive}
                  puzzleNumber={puzzle?.number}
                />
              )}

              {/* Active Gameplay */}
              {(gameState === SOUP_GAME_STATES.PLAYING ||
                gameState === SOUP_GAME_STATES.ADMIRE) && (
                <ElementSoupGameScreen
                  targetElement={targetElement}
                  targetEmoji={targetEmoji}
                  parMoves={parMoves}
                  remainingTime={remainingTime}
                  movesCount={movesCount}
                  formatTime={formatTime}
                  sortedElementBank={sortedElementBank}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedA={selectedA}
                  selectedB={selectedB}
                  selectElement={selectElement}
                  clearSelections={clearSelections}
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
                  hintsRemaining={hintsRemaining}
                  onUseHint={useHint}
                />
              )}

              {/* Complete Screen */}
              {gameState === SOUP_GAME_STATES.COMPLETE && (
                <ElementSoupCompleteScreen
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
                  isArchive={isArchive}
                />
              )}

              {/* Game Over Screen (time ran out) */}
              {gameState === SOUP_GAME_STATES.GAME_OVER && (
                <ElementSoupGameOverScreen
                  targetElement={targetElement}
                  targetEmoji={targetEmoji}
                  elapsedTime={elapsedTime}
                  movesCount={movesCount}
                  completionStats={completionStats}
                  onRetry={resetGame}
                  onStartFreePlay={startFreePlay}
                />
              )}
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
      />

      {/* Learn to Play Banner - outside scrollable container for proper click handling */}
      {(gameState === SOUP_GAME_STATES.PLAYING || gameState === SOUP_GAME_STATES.ADMIRE) && (
        <LearnToPlayBanner gameType="soup" onOpenHowToPlay={() => setShowHowToPlay(true)} />
      )}

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        onSelectPuzzle={(date) => {
          setShowArchive(false);
          router.push(`/element-soup?date=${date}`);
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
    </>
  );
}

export default ElementSoupGame;
