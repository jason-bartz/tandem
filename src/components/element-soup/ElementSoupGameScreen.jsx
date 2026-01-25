'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { StatsAndTargetRow } from './TargetDisplay';
import { CombinationArea } from './CombinationArea';
import { ElementBank } from './ElementBank';

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
    const shareText = `I'm the first to discover:\n${result.emoji} ${result.element}\n(${result.from[0]} + ${result.from[1]})\nIn Element Soup!\n\nwww.tandemdaily.com/element-soup`;

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
        {/* Close button for first discoveries */}
        {result.isFirstDiscovery && (
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
        )}

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
          initial={!reduceMotion ? { scale: 0 } : false}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.1 }}
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
 * ElementSoupGameScreen - Active gameplay screen
 */
export function ElementSoupGameScreen({
  // Target
  targetElement,
  targetEmoji,
  parMoves,

  // Timer & Stats
  elapsedTime,
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
}) {
  // Check if target is found (not applicable in free play mode)
  const isTargetFound = freePlayMode
    ? false
    : sortedElementBank.some((el) => el.name.toLowerCase() === targetElement?.toLowerCase());

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Stats and Target Row - hidden in free play mode */}
      {!freePlayMode && (
        <StatsAndTargetRow
          time={elapsedTime}
          moves={movesCount}
          formatTime={formatTime}
          targetElement={targetElement}
          targetEmoji={targetEmoji}
          parMoves={parMoves}
          isTargetFound={isTargetFound}
        />
      )}

      {/* Free Play Mode Header */}
      {freePlayMode && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-soup-light/50 dark:bg-soup-primary/10 rounded-xl border-2 border-soup-light dark:border-soup-primary/30">
          <span className="text-soup-dark dark:text-soup-primary text-sm font-medium">
            🔭 Discovered {sortedElementBank.length} elements and counting...
          </span>
        </div>
      )}

      {/* Combination Area */}
      <CombinationArea
        selectedA={selectedA}
        selectedB={selectedB}
        onClearA={clearSelections}
        onClearB={clearSelections}
        onCombine={combineElements}
        onClear={clearSelections}
        isCombining={isCombining}
        isAnimating={isAnimating}
        disabled={isComplete && !freePlayMode}
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
          disabled={isCombining || isAnimating || (isComplete && !freePlayMode)}
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

export default ElementSoupGameScreen;
