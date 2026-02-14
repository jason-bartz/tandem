'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Share2, ArrowLeft, Loader2, Check, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { isStandaloneAlchemy } from '@/lib/standalone';

const shareUrl = isStandaloneAlchemy ? 'dailyalchemy.fun' : 'tandemdaily.com/daily-alchemy';

/**
 * Format seconds into m:ss display
 */
function formatWaitTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * CoopLobbyScreen - Shown when in co-op lobby state
 * Three sub-flows:
 * 1. Create Game: Choose fresh or load from save, then show invite code
 * 2. Join Game: Enter invite code
 * 3. Quick Match: Enter matchmaking queue to be paired with a random partner
 */
export function CoopLobbyScreen({
  onCreateSession,
  onJoinSession,
  onCancel,
  inviteCode,
  isWaiting,
  isConnected,
  error,
  onClearError,
  slotSummaries,
  onLoadSlotSummaries,
  targetElement,
  targetEmoji,
  parMoves,
  isArchive,
  // Quick Match props
  matchmakingStatus,
  matchmakingQueuePosition,
  matchmakingWaitTime,
  matchmakingError,
  onStartMatchmaking,
  onSelectMatchmakingMode,
  onCancelMatchmaking,
  onExtendSearch,
  onClearMatchmakingError,
  onFallbackToCreate,
  matchedPartner,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [createStep, setCreateStep] = useState(null); // null | 'mode_select' | 'creative_options'
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus join code input
  useEffect(() => {
    if (mode === 'join' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  // Load slot summaries when showing save slots
  useEffect(() => {
    if (showSaveSlots && onLoadSlotSummaries) {
      onLoadSlotSummaries();
    }
  }, [showSaveSlots, onLoadSlotSummaries]);

  const handleCreate = async (saveSlot = null, sessionMode = 'creative') => {
    setIsCreating(true);
    onClearError?.();
    await onCreateSession(saveSlot, sessionMode);
    setIsCreating(false);
  };

  const handleJoin = async () => {
    if (joinCode.length !== 6) return;
    setIsJoining(true);
    onClearError?.();
    const result = await onJoinSession(joinCode);
    if (!result) {
      setIsJoining(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    const shareText = `Join my Daily Alchemy co-op game! Code: ${inviteCode}\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silent fail
      }
    }
  };

  // ─── Quick Match: Searching State ─────────────────────────────
  if (matchmakingStatus === 'searching') {
    return (
      <div className="flex flex-col items-center w-full px-4 pb-8">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Radar animation */}
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <Shuffle className="w-8 h-8 text-amber-500 dark:text-amber-400 z-10" />
            {!reduceMotion && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-amber-400/40"
                  animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-amber-400/40"
                  animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-amber-400/40"
                  animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 1.4 }}
                />
              </>
            )}
          </div>

          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
            Looking for a partner...
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {formatWaitTime(matchmakingWaitTime || 0)}
          </p>

          {matchmakingQueuePosition && matchmakingQueuePosition > 1 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              #{matchmakingQueuePosition} in queue
            </p>
          )}

          <button
            onClick={onCancelMatchmaking}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Quick Match: Match Found State ───────────────────────────
  if (matchmakingStatus === 'matched' && matchedPartner) {
    return (
      <div className="flex flex-col items-center w-full px-4 pb-8">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center"
          initial={!reduceMotion ? { opacity: 0, scale: 0.9 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.div
            className="text-4xl mb-4"
            initial={!reduceMotion ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 0.1 }}
          >
            🎉
          </motion.div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Match Found!</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Matched with <span className="font-semibold">{matchedPartner.username}</span>
            {matchedPartner.countryFlag && (
              <span className="ml-1">{matchedPartner.countryFlag}</span>
            )}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Starting game...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Quick Match: Timeout State ───────────────────────────────
  if (matchmakingStatus === 'timeout') {
    return (
      <div className="flex flex-col items-center w-full px-4 pb-8">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
            No players found
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            No one else is searching right now. Try again later or invite a friend!
          </p>

          {/* Keep Waiting */}
          <button
            onClick={onExtendSearch}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 mb-3',
              'bg-amber-500 text-white',
              'border-[3px] border-black',
              'rounded-xl font-bold',
              'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
              'hover:bg-amber-600',
              'hover:translate-y-[-1px]',
              'active:translate-y-0 active:shadow-none',
              'transition-all duration-150'
            )}
          >
            Keep Waiting
          </button>

          {/* Share Invite Code (falls back to create flow) */}
          <button
            onClick={onFallbackToCreate}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 mb-3',
              'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-xl font-bold',
              'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'hover:translate-y-[-1px]',
              'active:translate-y-0 active:shadow-none',
              'transition-all duration-150'
            )}
          >
            <Share2 className="w-4 h-4" />
            Share Invite Code Instead
          </button>

          {/* Cancel */}
          <button
            onClick={onCancelMatchmaking}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Quick Match: Mode Selection ──────────────────────────────
  if (matchmakingStatus === 'selecting_mode') {
    return (
      <div className="flex flex-col items-center w-full px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key="matchmaking-mode"
            className="w-full max-w-sm flex flex-col items-center"
            initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={!reduceMotion ? { opacity: 0, y: -10 } : undefined}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shuffle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Quick Match</h2>
            </div>

            {/* Today's Puzzle */}
            {!isArchive && (
              <button
                onClick={() => onSelectMatchmakingMode('daily')}
                className={cn(
                  'w-full flex flex-col items-center py-4 mb-3',
                  'bg-amber-500 text-white',
                  'border-[3px] border-black',
                  'rounded-xl font-bold',
                  'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                  'hover:bg-amber-600',
                  'hover:translate-y-[-1px]',
                  'active:translate-y-0 active:shadow-none',
                  'transition-all duration-150'
                )}
              >
                <span>Today&apos;s Puzzle</span>
                {targetElement && (
                  <span className="text-sm font-normal opacity-90 mt-1">
                    {targetEmoji} {targetElement} · Par: {parMoves} moves · 10:00 limit
                  </span>
                )}
              </button>
            )}

            {/* Creative Mode */}
            <button
              onClick={() => onSelectMatchmakingMode('creative')}
              className={cn(
                'w-full flex flex-col items-center py-4 mb-3',
                'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-xl font-bold',
                'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'hover:translate-y-[-1px]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150'
              )}
            >
              <span>Creative Mode</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                Create endlessly with no goal or timer
              </span>
            </button>

            {matchmakingError && (
              <div className="w-full p-3 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 text-center">
                {matchmakingError}
              </div>
            )}

            {/* Back */}
            <button
              onClick={() => {
                onCancelMatchmaking?.();
                onClearMatchmakingError?.();
              }}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─── Quick Match: Error State ─────────────────────────────────
  if (matchmakingStatus === 'error') {
    return (
      <div className="flex flex-col items-center w-full px-4 pb-8">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
            Something went wrong
          </h2>
          {matchmakingError && (
            <div className="w-full p-3 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 text-center">
              {matchmakingError}
            </div>
          )}
          <button
            onClick={() => {
              onClearMatchmakingError?.();
            }}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Back
          </button>
        </motion.div>
      </div>
    );
  }

  // Waiting for partner screen (after creating session)
  if (inviteCode && isWaiting) {
    return (
      <div className="flex flex-col items-center w-full px-4 pb-8">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Invite Code Card */}
          <div
            className={cn(
              'w-full p-6 mb-6',
              'bg-indigo-50 dark:bg-indigo-950/30',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-2xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
              highContrast && 'border-[4px] border-hc-border'
            )}
          >
            <div className="text-center mb-4">
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-wider mb-2">
                INVITE CODE
              </div>
              <div className="text-4xl font-mono font-bold tracking-[0.3em] text-gray-900 dark:text-white">
                {inviteCode}
              </div>
            </div>

            {/* Share / Copy Button */}
            <button
              onClick={handleCopyCode}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3',
                'bg-indigo-500 text-white',
                'border-[3px] border-black',
                'rounded-xl font-bold',
                'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                'hover:bg-indigo-600',
                'hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  {navigator.share ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Share Code</span>
                </>
              )}
            </button>
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center gap-3 mb-6 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Waiting for partner to join...</span>
          </div>

          {/* Connection status */}
          {isConnected && (
            <div className="flex items-center gap-2 mb-4 text-xs text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Connected</span>
            </div>
          )}

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  // Mode selection or sub-flow
  return (
    <div className="flex flex-col items-center w-full px-4 pb-8">
      <AnimatePresence mode="wait">
        {!mode ? (
          // Mode selection
          <motion.div
            key="select"
            className="w-full max-w-sm flex flex-col items-center"
            initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={!reduceMotion ? { opacity: 0, y: -10 } : undefined}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Co-op Mode</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Solve today&apos;s puzzle or explore creative mode together with a friend in real
              time.
            </p>

            {/* Create Game */}
            <button
              onClick={() => setMode('create')}
              className={cn(
                'w-full flex items-center justify-center gap-3 py-4 mb-3',
                'bg-indigo-500 text-white',
                'border-[3px] border-black',
                'rounded-xl font-bold text-lg',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                'hover:bg-indigo-600',
                'hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150',
                highContrast && 'border-[4px]'
              )}
            >
              Create Game
            </button>

            {/* Join Game */}
            <button
              onClick={() => setMode('join')}
              className={cn(
                'w-full flex items-center justify-center gap-3 py-4 mb-3',
                'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-xl font-bold text-lg',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(75,85,99,1)]',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150',
                highContrast && 'border-[4px] border-hc-border'
              )}
            >
              Join with Code
            </button>

            {/* Quick Match */}
            <button
              onClick={onStartMatchmaking}
              className={cn(
                'w-full flex items-center justify-center gap-3 py-4',
                'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                'border-[3px] border-black',
                'rounded-xl font-bold text-lg',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                'hover:from-amber-600 hover:to-orange-600',
                'hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150',
                highContrast && 'border-[4px]'
              )}
            >
              <Shuffle className="w-5 h-5" />
              Quick Match
            </button>

            {/* Terms notice */}
            <p className="mt-6 text-[11px] text-gray-400 dark:text-gray-500 text-center px-4 leading-relaxed">
              By using Co-op Mode, you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                Terms
              </a>{' '}
              and{' '}
              <a
                href="/privacypolicy"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
              >
                Privacy Policy
              </a>
              .
            </p>

            {/* Back */}
            <button
              onClick={onCancel}
              className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Back
            </button>
          </motion.div>
        ) : mode === 'create' ? (
          // Create game flow
          <motion.div
            key="create"
            className="w-full max-w-sm flex flex-col items-center"
            initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={!reduceMotion ? { opacity: 0, y: -10 } : undefined}
          >
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Create Co-op Game
            </h2>

            {createStep !== 'creative_options' ? (
              // Mode selection: Today's Puzzle vs Creative Mode
              <>
                {/* Today's Puzzle */}
                {!isArchive && (
                  <button
                    onClick={() => handleCreate(null, 'daily')}
                    disabled={isCreating}
                    className={cn(
                      'w-full flex flex-col items-center py-4 mb-3',
                      'bg-indigo-500 text-white',
                      'border-[3px] border-black',
                      'rounded-xl font-bold',
                      'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                      'hover:bg-indigo-600',
                      'hover:translate-y-[-1px]',
                      'active:translate-y-0 active:shadow-none',
                      'transition-all duration-150',
                      isCreating && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Today&apos;s Puzzle</span>
                        {targetElement && (
                          <span className="text-sm font-normal opacity-90 mt-1">
                            {targetEmoji} {targetElement} · Par: {parMoves} moves · 10:00 limit
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}

                {/* Creative Mode */}
                <button
                  onClick={() => setCreateStep('creative_options')}
                  disabled={isCreating}
                  className={cn(
                    'w-full flex flex-col items-center py-4 mb-3',
                    'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                    'border-[3px] border-black dark:border-gray-600',
                    'rounded-xl font-bold',
                    'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'hover:translate-y-[-1px]',
                    'active:translate-y-0 active:shadow-none',
                    'transition-all duration-150'
                  )}
                >
                  <span>Creative Mode</span>
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                    Create endlessly with no goal or timer
                  </span>
                </button>
              </>
            ) : (
              // Creative options: Start Fresh or Load from Save
              <>
                {/* Start Fresh */}
                <button
                  onClick={() => handleCreate(null, 'creative')}
                  disabled={isCreating}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 py-4 mb-3',
                    'bg-indigo-500 text-white',
                    'border-[3px] border-black',
                    'rounded-xl font-bold',
                    'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                    'hover:bg-indigo-600',
                    'hover:translate-y-[-1px]',
                    'active:translate-y-0 active:shadow-none',
                    'transition-all duration-150',
                    isCreating && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Fresh'}
                </button>

                {/* Load from Save */}
                <button
                  onClick={() => setShowSaveSlots(!showSaveSlots)}
                  disabled={isCreating}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 py-4 mb-3',
                    'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                    'border-[3px] border-black dark:border-gray-600',
                    'rounded-xl font-bold',
                    'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'hover:translate-y-[-1px]',
                    'active:translate-y-0 active:shadow-none',
                    'transition-all duration-150'
                  )}
                >
                  Load from Save
                </button>

                {/* Save Slots */}
                <AnimatePresence>
                  {showSaveSlots && slotSummaries && (
                    <motion.div
                      className="w-full space-y-2 mb-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {slotSummaries.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => slot.hasSave && handleCreate(slot.slot, 'creative')}
                          disabled={!slot.hasSave || isCreating}
                          className={cn(
                            'w-full p-3 text-left',
                            'bg-gray-50 dark:bg-gray-800',
                            'border-[2px] border-gray-300 dark:border-gray-600',
                            'rounded-lg',
                            'transition-colors',
                            slot.hasSave
                              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                              : 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                            {slot.name || `Save ${slot.slot}`}
                          </div>
                          {slot.hasSave ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {slot.elementCount} elements
                              {slot.firstDiscoveries > 0 &&
                                ` · ${slot.firstDiscoveries} first discoveries`}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              Empty
                            </div>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {error && (
              <div className="w-full p-3 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Back */}
            <button
              onClick={() => {
                if (createStep === 'creative_options') {
                  setCreateStep(null);
                  setShowSaveSlots(false);
                } else {
                  setMode(null);
                  setCreateStep(null);
                }
                onClearError?.();
              }}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
          </motion.div>
        ) : (
          // Join game flow
          <motion.div
            key="join"
            className="w-full max-w-sm flex flex-col items-center"
            initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={!reduceMotion ? { opacity: 0, y: -10 } : undefined}
          >
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              Enter Invite Code
            </h2>

            {/* Code Input */}
            <input
              ref={inputRef}
              type="text"
              value={joinCode}
              onChange={(e) => {
                const val = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6);
                setJoinCode(val);
                onClearError?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              placeholder="ABC123"
              maxLength={6}
              className={cn(
                'w-full text-center text-3xl font-mono font-bold tracking-[0.3em] py-4 mb-4',
                'bg-white dark:bg-gray-800',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-xl',
                'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300',
                'text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600',
                'uppercase'
              )}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {error && (
              <div className="w-full p-3 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Join Button */}
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 6 || isJoining}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-4 mb-4',
                'bg-indigo-500 text-white',
                'border-[3px] border-black',
                'rounded-xl font-bold text-lg',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                'hover:bg-indigo-600',
                'hover:translate-y-[-1px]',
                'active:translate-y-0 active:shadow-none',
                'transition-all duration-150',
                (joinCode.length !== 6 || isJoining) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                'Join Game'
              )}
            </button>

            {/* Back */}
            <button
              onClick={() => {
                setMode(null);
                setJoinCode('');
                onClearError?.();
              }}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CoopLobbyScreen;
