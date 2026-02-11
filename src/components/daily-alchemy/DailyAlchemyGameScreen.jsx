'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, useAnimation } from 'framer-motion';
import { Check, Loader2, ChevronUp, ChevronDown, FolderOpen, Save, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { playPlunkSound } from '@/lib/sounds';
import { StatsAndTargetRow } from './TargetDisplay';
import { CombinationArea } from './CombinationArea';
import { ElementBank } from './ElementBank';
import { EmbeddedFavorites } from './EmbeddedFavorites';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';
import { isStandaloneAlchemy } from '@/lib/standalone';
import { SunburstRays } from './SunburstRays';
import { CoopPartnerBar } from './CoopPartnerBar';

const shareUrl = isStandaloneAlchemy ? 'dailyalchemy.fun' : 'tandemdaily.com/daily-alchemy';

/**
 * ResultAnimation - Shows the result of a combination
 * Swipe up to select element into first combination slot
 * Swipe down to dismiss
 */
function ResultAnimation({ result, onComplete, onSelectElement }) {
  const { reduceMotion, highContrast } = useTheme();
  const { mediumTap, lightTap } = useHaptics();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const controls = useAnimation();
  const shareCardRef = useRef(null);

  // Motion value for drag
  const y = useMotionValue(0);

  // Start the entrance animation on mount
  useEffect(() => {
    controls.start({ scale: 1, rotate: 0, opacity: 1, y: 0 });
  }, [controls]);

  // No auto-dismiss - user must swipe
  // (removed the auto-dismiss timer)

  if (!result) return null;

  // Format today's date
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = async (e) => {
    e?.stopPropagation();

    if (!shareCardRef.current || isSharing) return;

    setIsSharing(true);

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Try native share on iOS/mobile (allows saving to Photos)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File(
            [blob],
            `first-discovery-${result.element.toLowerCase().replace(/\s+/g, '-')}.png`,
            { type: 'image/png' }
          );

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `First Discovery: ${result.element}`,
              text: `I'm the first player to discover ${result.emoji} ${result.element} in Daily Alchemy!\n\nPlay now at ${shareUrl}`,
            });
            setIsSharing(false);
            return;
          }
        } catch (shareError) {
          // Check if user cancelled the share sheet - this is not an error, just do nothing
          if (shareError?.name === 'AbortError') {
            setIsSharing(false);
            return;
          }
          // For other errors, fall through to fallback only on non-iOS platforms
          // On iOS (Capacitor), avoid download fallback as it causes navigation issues
          const isIOS =
            typeof window !== 'undefined' &&
            (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.userAgent.includes('Mac') && 'ontouchend' in document));
          if (isIOS) {
            // On iOS, fall back to text share instead of download
            const shareText = `I'm the first to discover:\n${result.emoji} ${result.element}\n(${result.from[0]} ${result.operator || '+'} ${result.from[1]})\nIn Daily Alchemy!\n\n${shareUrl}`;
            try {
              await navigator.clipboard.writeText(shareText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard failed, just continue without feedback
            }
            setIsSharing(false);
            return;
          }
        }
      }

      // Fallback for desktop: download as file
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `first-discovery-${result.element.toLowerCase().replace(/\s+/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fall back to text share
      const shareText = `I'm the first to discover:\n${result.emoji} ${result.element}\n(${result.from[0]} ${result.operator || '+'} ${result.from[1]})\nIn Daily Alchemy!\n\n${shareUrl}`;
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard failed, just continue without feedback
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle "use" action - select element into first slot
  const handleUse = async () => {
    // Don't allow interactions while sharing
    if (isSharing) return;

    // Immediately hide sunburst so it doesn't linger during card animation
    setDismissing(true);

    // Play plunk sound and haptic
    playPlunkSound();
    mediumTap();

    // Animate card flying up
    await controls.start({
      y: -600,
      opacity: 0,
      scale: 0.5,
      transition: { duration: 0.25, ease: 'easeOut' },
    });

    // Select the element into first slot
    onSelectElement?.({ name: result.element, emoji: result.emoji });
    onComplete?.();
  };

  // Handle "close" action - dismiss without selecting
  const handleClose = async () => {
    // Don't allow interactions while sharing
    if (isSharing) return;

    // Immediately hide sunburst so it doesn't linger during card animation
    setDismissing(true);

    // Light haptic for dismiss
    lightTap();

    // Animate card flying down
    await controls.start({
      y: 600,
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.25, ease: 'easeOut' },
    });

    onComplete?.();
  };

  const handleDragEnd = async (event, info) => {
    // Don't allow interactions while sharing
    if (isSharing) return;

    const offsetY = info.offset.y;
    const velocityY = info.velocity.y;

    // Swipe UP - select element into first slot
    if (offsetY < -60 || velocityY < -400) {
      await handleUse();
    }
    // Swipe DOWN - dismiss
    else if (offsetY > 60 || velocityY > 400) {
      await handleClose();
    }
    // Not enough - spring back
    else {
      controls.start({
        y: 0,
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.15 }}
    >
      {/* Sunburst rays for first discoveries - renders behind backdrop */}
      {result.isFirstDiscovery && !dismissing && <SunburstRays />}

      {/* Separate backdrop div for reliable click handling on mobile */}
      {/* IMPORTANT: Directly call onComplete() instead of handleClose() to bypass animation issues on mobile */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          setDismissing(true);
          onComplete?.();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDismissing(true);
          onComplete?.();
        }}
      />
      <motion.div
        className={cn(
          'relative flex flex-col items-center gap-2 px-8 pt-6 pb-4',
          'bg-white dark:bg-gray-800',
          'border-[4px] border-black dark:border-gray-600',
          result.isFirstDiscovery && 'bg-yellow-50 dark:bg-gray-800',
          'rounded-2xl',
          'shadow-[6px_6px_0px_rgba(0,0,0,1)]',
          'cursor-grab active:cursor-grabbing',
          'select-none'
        )}
        style={{ y }}
        initial={!reduceMotion ? { scale: 0, rotate: -10, opacity: 0 } : { opacity: 0 }}
        animate={controls}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        drag="y"
        dragConstraints={{ top: -150, bottom: 150 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        onClick={(e) => e.stopPropagation()}
      >
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
          {result.from[0]} {result.operator || '+'} {result.from[1]}
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
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isSharing) handleShare();
            }}
            disabled={isSharing}
            className={cn(
              'mt-2 flex items-center justify-center gap-2 px-5 py-2',
              'bg-yellow-500 text-white',
              'border-[2px] border-black',
              'rounded-xl font-bold text-sm',
              'transition-colors duration-150',
              'disabled:opacity-70',
              highContrast && 'border-[3px]'
            )}
            initial={{ opacity: 0, y: 10, boxShadow: '2px 2px 0px rgba(0,0,0,1)' }}
            animate={{ opacity: 1, y: 0, boxShadow: '2px 2px 0px rgba(0,0,0,1)' }}
            whileHover={{
              y: -1,
              boxShadow: '3px 3px 0px rgba(0,0,0,1)',
              backgroundColor: '#ca8a04', // yellow-600
            }}
            whileTap={{ y: 0, boxShadow: 'none' }}
            transition={{ delay: 0.5 }}
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Share</span>
            )}
          </motion.button>
        )}

        {/* Swipe hints at bottom - also clickable */}
        <motion.div
          className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              mediumTap();
              playPlunkSound();
              onSelectElement?.({ name: result.element, emoji: result.emoji });
              onComplete?.();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mediumTap();
              playPlunkSound();
              onSelectElement?.({ name: result.element, emoji: result.emoji });
              onComplete?.();
            }}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
            <span>swipe to use</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              lightTap();
              onComplete?.();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              lightTap();
              onComplete?.();
            }}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            <span>swipe to close</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Hidden shareable card for first discoveries */}
      {result.isFirstDiscovery && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <div ref={shareCardRef} className="bg-white p-3 pb-[22px] pr-[22px]">
            {/* Outer card with shadow */}
            <div className="relative">
              <div className="absolute top-[6px] left-[6px] right-[-6px] bottom-[-6px] bg-black rounded-xl" />
              <div className="relative bg-amber-50 rounded-xl border-[3px] border-black p-6 w-[340px]">
                {/* Element display */}
                <div className="text-center mb-6">
                  <span className="text-6xl mb-3 block">{result.emoji}</span>
                  <h3 className="text-2xl font-bold text-gray-900">{result.element}</h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-amber-500">✨</span>
                    <span className="text-sm font-medium text-amber-600">First Discovery</span>
                  </div>
                </div>

                {/* Combination box with shadow */}
                <div className="relative mb-6">
                  <div className="absolute top-[4px] left-[4px] right-[-4px] bottom-[-4px] bg-black rounded-xl" />
                  <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-[2px] border-black p-4">
                    <p className="text-xs text-gray-500 mb-3 tracking-wide font-bold text-center">
                      Created By Combining
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-3xl mb-1">{result.fromEmojis?.[0] || '✨'}</span>
                        <span className="font-bold text-gray-900 text-sm text-center">
                          {result.from[0]}
                        </span>
                      </div>
                      <span className="text-blue-500 font-bold text-2xl">
                        {result.operator || '+'}
                      </span>
                      <div className="flex flex-col items-center">
                        <span className="text-3xl mb-1">{result.fromEmojis?.[1] || '✨'}</span>
                        <span className="font-bold text-gray-900 text-sm text-center">
                          {result.from[1]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{formatDate()}</span>
                  </div>
                </div>

                {/* Branding */}
                <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                  <span className="text-xs font-bold text-gray-400">{shareUrl}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
  isSubtractMode = false,
  toggleOperatorMode,

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
  onUseHint,
  currentHintMessage = null,
  onClearHintMessage,

  // Creative Mode saves
  onOpenSavesModal,
  isAutoSaving = false,
  autoSaveComplete = false,
  isSlotSwitching = false,

  // Favorites
  favoriteElements = new Set(),
  onToggleFavorite,
  onClearAllFavorites,
  showFavoritesPanel = false,
  onToggleFavoritesPanel,
  maxFavorites = 15,

  // Co-op
  coopMode = false,
  coopPartner = null,
  coopPartnerStatus = null,
  coopReceivedEmote = null,
  onCoopSendEmote,
  coopEmoteCooldownActive = false,
  onCoopSave,
  onCoopLeave,
}) {
  const { highContrast } = useTheme();

  // Calculate discovered elements (excluding starters) - use unfiltered elementBank for accurate count
  const discoveredCount = elementBank.length - STARTER_ELEMENTS.length;
  // Check if target is found (not applicable in free play mode)
  const isTargetFound = freePlayMode
    ? false
    : sortedElementBank.some((el) => el.name.toLowerCase() === targetElement?.toLowerCase());

  // Handle drag and drop to combination slots
  const handleDropElement = useCallback(
    (elementName, _position) => {
      // Find the element by name from the element bank
      const element = elementBank.find((el) => el.name === elementName);
      if (element && selectElement) {
        selectElement(element);
      }
    },
    [elementBank, selectElement]
  );

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
          onUseHint={onUseHint}
          hintDisabled={isCombining || isAnimating || isComplete}
          isCountdown={true}
          centered={true}
        />
      )}

      {/* Creative Mode / Co-op Mode Header */}
      {freePlayMode && !coopMode && (
        <div className="flex items-center gap-2 py-2">
          {/* Saves button */}
          <button
            onClick={onOpenSavesModal}
            disabled={isSlotSwitching}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2',
              'text-sm font-bold',
              'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200',
              'border-[2px] border-black dark:border-gray-600',
              'rounded-xl',
              'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
              'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
              'active:translate-y-0 active:shadow-none',
              'transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              highContrast && 'border-[3px] border-hc-border'
            )}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Saves</span>
          </button>

          {/* Auto-save indicator */}
          <AnimatePresence>
            {(isAutoSaving || autoSaveComplete) && (
              <motion.span
                className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isAutoSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Saved</span>
                  </>
                )}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="flex items-center gap-3 ml-auto text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {discoveredCount}
              </span>{' '}
              created
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {firstDiscoveryElements.length}
              </span>{' '}
              first
            </span>
          </div>
        </div>
      )}

      {/* Co-op Mode Header */}
      {coopMode && (
        <div className="flex flex-col gap-2 py-2">
          {/* Top row: Save/Leave buttons + stats */}
          <div className="flex items-center gap-2">
            {/* Save button */}
            <button
              onClick={onCoopSave}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2',
                'text-sm font-bold',
                'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200',
                'border-[2px] border-black dark:border-gray-600',
                'rounded-xl',
                'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
                'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150',
                highContrast && 'border-[3px] border-hc-border'
              )}
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>

            {/* Leave button */}
            <button
              onClick={onCoopLeave}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2',
                'text-sm font-bold',
                'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                'border-[2px] border-red-300 dark:border-red-700',
                'rounded-xl',
                'shadow-[2px_2px_0px_rgba(0,0,0,0.3)]',
                'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
                'hover:bg-red-100 dark:hover:bg-red-900/50',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150',
                highContrast && 'border-[3px] border-hc-border'
              )}
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </button>

            {/* Stats */}
            <div className="flex items-center gap-3 ml-auto text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {discoveredCount}
                </span>{' '}
                created
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {firstDiscoveryElements.length}
                </span>{' '}
                first
              </span>
            </div>
          </div>

          {/* Partner bar */}
          <CoopPartnerBar
            partner={coopPartner}
            partnerStatus={coopPartnerStatus}
            receivedEmote={coopReceivedEmote}
            onSendEmote={onCoopSendEmote}
            emoteCooldownActive={coopEmoteCooldownActive}
          />
        </div>
      )}

      {/* Main game area - side-by-side on desktop, stacked on mobile */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 lg:gap-4">
        {/* Left column: Combination Area + Favorites on desktop */}
        <div className="flex-shrink-0 lg:w-[340px] lg:flex lg:flex-col lg:gap-3">
          <CombinationArea
            selectedA={selectedA}
            selectedB={selectedB}
            onSelectSlot={setActiveSlot}
            onCombine={combineElements}
            onClear={clearSelections}
            isCombining={isCombining}
            isAnimating={isAnimating}
            disabled={isComplete && !freePlayMode}
            combinationError={combinationError}
            onDropElement={handleDropElement}
            hintMessage={currentHintMessage}
            onDismissHint={onClearHintMessage}
            isSubtractMode={isSubtractMode}
            onToggleOperator={toggleOperatorMode}
            freePlayMode={freePlayMode}
            activeSlot={activeSlot}
          />

          {/* Embedded Favorites - desktop only */}
          <div className="hidden lg:block lg:flex-1 lg:min-h-0">
            <EmbeddedFavorites
              elements={elementBank}
              favoriteElements={favoriteElements}
              onToggleFavorite={onToggleFavorite}
              onClearAllFavorites={onClearAllFavorites}
              onSelectElement={selectElement}
              selectedA={selectedA}
              selectedB={selectedB}
              maxFavorites={maxFavorites}
              recentElements={recentElements}
              firstDiscoveryElements={firstDiscoveryElements}
            />
          </div>
        </div>

        {/* Element Bank - fills remaining space */}
        <div className="flex-1 min-h-0 flex flex-col relative">
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
            favoriteElements={favoriteElements}
            onToggleFavorite={onToggleFavorite}
            onClearAllFavorites={onClearAllFavorites}
            showFavoritesPanel={showFavoritesPanel}
            onToggleFavoritesPanel={onToggleFavoritesPanel}
            maxFavorites={maxFavorites}
            allElements={elementBank}
            isDesktopSidePanel={true}
            hideDesktopFavorites={true}
          />
        </div>
      </div>

      {/* Result Animation Overlay */}
      {/* Removed mode="wait" to prevent exit animation from blocking */}
      <AnimatePresence>
        {lastResult && !isComplete && (
          <ResultAnimation
            key={`${lastResult.element}-${lastResult.from.join('-')}`}
            result={lastResult}
            onComplete={clearLastResult}
            onSelectElement={selectResultElement}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default DailyAlchemyGameScreen;
