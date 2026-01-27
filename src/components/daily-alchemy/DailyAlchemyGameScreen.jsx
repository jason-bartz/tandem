'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, Save, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { StatsAndTargetRow } from './TargetDisplay';
import { CombinationArea } from './CombinationArea';
import { ElementBank } from './ElementBank';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

/**
 * ResultAnimation - Shows the result of a combination
 * Auto-dismisses after timeout or on tap/click (except for first discoveries)
 * First discoveries stay on screen until explicitly closed and include a share button
 */
function ResultAnimation({ result, onComplete }) {
  const { reduceMotion, highContrast } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Don't auto-dismiss for first discoveries - they stay until user closes
    if (result?.isFirstDiscovery) return;

    // Longer duration: 3.5s normal, 1.5s with reduced motion
    const timer = setTimeout(
      () => {
        onComplete?.();
      },
      reduceMotion ? 1500 : 3500
    );

    return () => clearTimeout(timer);
  }, [onComplete, reduceMotion, result?.isFirstDiscovery]);

  if (!result) return null;

  const handleShare = async () => {
    const shareText = `I'm the first to discover:\n${result.emoji} ${result.element}\n(${result.from[0]} + ${result.from[1]})\nIn Daily Alchemy!\n\nwww.tandemdaily.com/daily-alchemy`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch (err) {
        // User cancelled or share failed, try clipboard
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // For first discoveries, only close on backdrop click, not card click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onComplete?.();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={result.isFirstDiscovery ? handleBackdropClick : onComplete}
    >
      <motion.div
        className={cn(
          'relative flex flex-col items-center gap-2 p-6',
          'bg-white dark:bg-gray-800',
          'border-[4px] border-black dark:border-gray-600',
          result.isFirstDiscovery && 'bg-yellow-50 dark:bg-yellow-900/30',
          'rounded-2xl',
          'shadow-[6px_6px_0px_rgba(0,0,0,1)]',
          result.isFirstDiscovery && 'cursor-default'
        )}
        initial={!reduceMotion ? { scale: 0, rotate: -10 } : false}
        animate={{ scale: 1, rotate: 0 }}
        exit={!reduceMotion ? { scale: 0, opacity: 0 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={(e) => result.isFirstDiscovery && e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onComplete}
          className={cn(
            'absolute top-2 right-2',
            'flex items-center justify-center',
            'hover:opacity-70',
            'transition-opacity'
          )}
        >
          <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>

        {result.isFirstDiscovery && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-yellow-500 font-bold text-sm">✨ FIRST DISCOVERY! ✨</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              You're the first player to discover:
            </div>
          </motion.div>
        )}
        <motion.span
          className="text-6xl"
          style={{
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            transformOrigin: 'center center',
          }}
          initial={!reduceMotion ? { scale: 0 } : false}
          animate={!reduceMotion ? { scale: [0, 1.2, 1] } : { scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {result.emoji}
        </motion.span>
        <motion.span
          className="text-2xl font-jua text-gray-900 dark:text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {result.element}
        </motion.span>
        <motion.span
          className="text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {result.from[0]} + {result.from[1]}
        </motion.span>
        {result.isNew && !result.isFirstDiscovery && (
          <motion.span
            className="text-soup-primary font-semibold text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            New element discovered!
          </motion.span>
        )}

        {/* Share button for first discoveries */}
        {result.isFirstDiscovery && (
          <motion.button
            onClick={handleShare}
            className={cn(
              'mt-3 flex items-center justify-center gap-2 px-5 py-2',
              'bg-yellow-500 text-white',
              'border-[2px] border-black',
              'rounded-xl font-bold text-sm',
              'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
              'hover:bg-yellow-600',
              'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
              'active:translate-y-0 active:shadow-none',
              'transition-colors duration-150',
              highContrast && 'border-[3px]'
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <span>Share</span>
            )}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * DailyAlchemyGameScreen - Active gameplay screen
 */
export function DailyAlchemyGameScreen({
  // Target
  targetElement,
  targetEmoji,
  parMoves,

  // Timer & Stats
  remainingTime,
  movesCount,
  formatTime,

  // Element bank
  sortedElementBank,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery,

  // Selection
  selectedA,
  selectedB,
  isAutoSelectedA = false,
  selectElement,
  clearSelections,

  // Combination
  isCombining,
  isAnimating,
  combineElements,
  lastResult,
  clearLastResult,

  // Recent elements (for NEW badge - only show for last 5)
  recentElements = [],

  // First discovery elements (for golden styling)
  firstDiscoveryElements = [],

  // State
  isComplete,

  // Mode
  freePlayMode = false,

  // Error
  combinationError = null,

  // Hints
  hintsRemaining = 0,
  onUseHint,

  // Creative Mode save
  onSaveCreative,
  onClearCreative,
  isSavingCreative = false,
  creativeSaveSuccess = false,
}) {
  const { highContrast } = useTheme();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isCreativeMenuOpen, setIsCreativeMenuOpen] = useState(false);

  // Auto-close creative menu after 3 seconds of inactivity
  useEffect(() => {
    if (!isCreativeMenuOpen) return;

    const timer = setTimeout(() => {
      setIsCreativeMenuOpen(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isCreativeMenuOpen]);

  // Calculate discovered elements (excluding starters)
  const discoveredCount = sortedElementBank.length - STARTER_ELEMENTS.length;

  // Handle clear with confirmation
  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleClearConfirm = async () => {
    await onClearCreative?.();
    setShowClearConfirm(false);
  };
  // Check if target is found (not applicable in free play mode)
  const isTargetFound = freePlayMode
    ? false
    : sortedElementBank.some((el) => el.name.toLowerCase() === targetElement?.toLowerCase());

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Stats and Target Row - hidden in free play mode */}
      {!freePlayMode && (
        <StatsAndTargetRow
          time={remainingTime}
          moves={movesCount}
          formatTime={formatTime}
          targetElement={targetElement}
          targetEmoji={targetEmoji}
          parMoves={parMoves}
          isTargetFound={isTargetFound}
          hintsRemaining={hintsRemaining}
          onUseHint={onUseHint}
          hintDisabled={isCombining || isAnimating || isComplete}
          isCountdown={true}
        />
      )}

      {/* Creative Mode Header with collapsible menu */}
      {freePlayMode && (
        <div className="flex items-center gap-2 py-2 px-3">
          {/* Menu toggle button */}
          <button
            onClick={() => setIsCreativeMenuOpen(!isCreativeMenuOpen)}
            className={cn(
              'flex items-center justify-center px-3 py-2',
              'text-sm font-bold',
              'text-gray-700 dark:text-gray-300',
              'bg-gray-100 dark:bg-gray-700',
              'border-[2px] border-black dark:border-gray-600',
              'rounded-xl',
              'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
              'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
              'active:translate-y-0 active:shadow-none',
              'transition-all duration-150',
              highContrast && 'border-[3px] border-hc-border'
            )}
          >
            Menu
          </button>

          {/* Sliding buttons container */}
          <AnimatePresence mode="popLayout">
            {isCreativeMenuOpen && (
              <motion.div
                className="flex items-center gap-2 pr-1 pb-1"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                  opacity: { duration: 0.15 },
                }}
              >
                {/* Save button */}
                <motion.button
                  onClick={() => {
                    onSaveCreative?.();
                  }}
                  disabled={isSavingCreative}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 whitespace-nowrap',
                    'text-sm font-bold',
                    'bg-soup-primary text-white',
                    'border-[2px] border-black dark:border-gray-600',
                    'rounded-xl',
                    'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
                    'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                    'active:translate-y-0 active:shadow-none',
                    'transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
                    creativeSaveSuccess && 'bg-green-500',
                    highContrast && 'border-[3px] border-hc-border'
                  )}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -10, opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {isSavingCreative ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : creativeSaveSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{creativeSaveSuccess ? 'Saved!' : 'Save'}</span>
                </motion.button>

                {/* Start Fresh button */}
                <motion.button
                  onClick={handleClearClick}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 whitespace-nowrap',
                    'text-sm font-bold',
                    'bg-red-500 text-white',
                    'border-[2px] border-black dark:border-gray-600',
                    'rounded-xl',
                    'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
                    'hover:bg-red-600 hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                    'active:translate-y-0 active:shadow-none',
                    'transition-all duration-150',
                    highContrast && 'border-[3px] border-hc-border'
                  )}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -10, opacity: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.03,
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Start Fresh</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              className={cn(
                'flex flex-col gap-4 p-6 mx-4 max-w-sm',
                'bg-white dark:bg-gray-800',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-2xl',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start Fresh?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will delete your saved progress and reset your element bank to the 4 starter
                elements. This cannot be undone.
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className={cn(
                    'flex-1 px-4 py-2',
                    'text-sm font-medium',
                    'bg-gray-100 dark:bg-gray-700',
                    'text-gray-700 dark:text-gray-300',
                    'border-2 border-gray-300 dark:border-gray-600',
                    'rounded-xl',
                    'hover:bg-gray-200 dark:hover:bg-gray-600',
                    'transition-colors'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirm}
                  className={cn(
                    'flex-1 px-4 py-2',
                    'text-sm font-bold',
                    'bg-red-500 text-white',
                    'border-2 border-red-600',
                    'rounded-xl',
                    'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
                    'hover:bg-red-600',
                    'active:translate-y-[1px] active:shadow-none',
                    'transition-all duration-150'
                  )}
                >
                  Start Fresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combination Area */}
      <CombinationArea
        selectedA={selectedA}
        selectedB={selectedB}
        isAutoSelectedA={isAutoSelectedA}
        onClearA={clearSelections}
        onClearB={clearSelections}
        onCombine={combineElements}
        onClear={clearSelections}
        isCombining={isCombining}
        isAnimating={isAnimating}
        disabled={isComplete && !freePlayMode}
        combinationError={combinationError}
      />

      {/* Element Bank - fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ElementBank
          elements={sortedElementBank}
          selectedA={selectedA}
          selectedB={selectedB}
          onSelect={selectElement}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          targetElement={freePlayMode ? null : targetElement}
          recentElements={recentElements}
          firstDiscoveryElements={firstDiscoveryElements}
          disabled={isCombining || (isComplete && !freePlayMode)}
          discoveredCount={freePlayMode ? discoveredCount : null}
        />
      </div>

      {/* Result Animation Overlay */}
      <AnimatePresence mode="wait">
        {lastResult && !isComplete && (
          <ResultAnimation
            key={`${lastResult.element}-${lastResult.from.join('-')}`}
            result={lastResult}
            onComplete={clearLastResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default DailyAlchemyGameScreen;
