'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Users } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { isStandaloneAlchemy } from '@/lib/standalone';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatTime,
  getRandomMessage,
  CONGRATS_MESSAGES,
  COOP_CONGRATS_MESSAGES,
} from '@/lib/daily-alchemy.constants';
import confetti from 'canvas-confetti';
import PaywallModal from '@/components/PaywallModal';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';
import LoginReminderPopup from '@/components/shared/LoginReminderPopup';
import AuthModal from '@/components/auth/AuthModal';

/**
 * StatCard - Individual stat display with custom icon image (square layout)
 */
function StatCard({ iconSrc, label, value, highlight = false }) {
  const { highContrast } = useTheme();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-3',
        'aspect-square',
        'bg-white dark:bg-gray-800',
        'border-[2px] border-black',
        'rounded-xl',
        'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
        highlight && 'bg-soup-light/50 dark:bg-soup-primary/20',
        highContrast && 'border-[3px]'
      )}
    >
      <Image src={iconSrc} alt="" width={24} height={24} className="w-6 h-6 mb-1" />
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div
        className={cn(
          'font-bold text-gray-900 dark:text-white text-lg',
          highlight && 'text-soup-dark dark:text-soup-primary'
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * DailyAlchemyCompleteScreen - Shown when puzzle is completed
 */
export function DailyAlchemyCompleteScreen({
  targetElement,
  targetEmoji,
  elapsedTime,
  movesCount,
  parMoves,
  firstDiscoveries: _firstDiscoveries,
  firstDiscoveryElements,
  completionStats,
  winningCombination,
  onShare,
  onStartFreePlay,
  onViewArchive,
  isArchive = false,
  hintsUsed = 0,
  // Co-op props
  coopMode = false,
  coopPartner = null,
  coopPartnerStatus = null,
  onCoopContinueCreative,
  onCoopDecline,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Co-op continue creative flow
  const [coopContinueState, setCoopContinueState] = useState('choosing'); // 'choosing' | 'waiting' | 'declined'
  const [countdown, setCountdown] = useState(30);
  const hasDeclinedRef = useRef(false);

  // Co-op 30-second countdown timer
  useEffect(() => {
    if (!coopMode) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-decline when timer expires
          if (!hasDeclinedRef.current) {
            hasDeclinedRef.current = true;
            onCoopDecline?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [coopMode, onCoopDecline]);

  // Auto-decline if partner disconnects during waiting
  useEffect(() => {
    if (coopMode && coopPartnerStatus === 'disconnected' && coopContinueState === 'waiting') {
      if (!hasDeclinedRef.current) {
        hasDeclinedRef.current = true;
        onCoopDecline?.();
      }
    }
  }, [coopMode, coopPartnerStatus, coopContinueState, onCoopDecline]);

  const handleCoopYes = useCallback(() => {
    setCoopContinueState('waiting');
    onCoopContinueCreative?.();
  }, [onCoopContinueCreative]);

  const handleCoopNo = useCallback(() => {
    hasDeclinedRef.current = true;
    setCoopContinueState('declined');
    onCoopDecline?.();
  }, [onCoopDecline]);

  const handleFreePlayClick = () => {
    if (hasSubscription) {
      onStartFreePlay?.();
    } else {
      setShowPaywall(true);
    }
  };

  // Calculate par comparison - numerical format
  const parDiff = movesCount - parMoves;
  const parText = parDiff === 0 ? '0' : parDiff < 0 ? `${parDiff}` : `+${parDiff}`;
  const isUnderPar = parDiff < 0;

  // Trigger confetti on mount - green, yellow, white theme
  useEffect(() => {
    if (!reduceMotion) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Green, yellow, and white confetti
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#7ed957', '#6bc447', '#fbbf24', '#facc15', '#ffffff', '#fefce8'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#7ed957', '#6bc447', '#fbbf24', '#facc15', '#ffffff', '#fefce8'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [reduceMotion]);

  const handleShare = async () => {
    if (onShare) {
      const shareText = await onShare();
      if (shareText) {
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
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full px-1 pb-8">
      {/* Login reminder popup for non-authenticated users (hidden in co-op) */}
      {!user && !coopMode && (
        <LoginReminderPopup
          isVisible={showLoginPopup}
          onSignUp={() => {
            setShowLoginPopup(false);
            setShowAuthModal(true);
          }}
          onDismiss={() => setShowLoginPopup(false)}
          gameType="soup"
        />
      )}

      {/* Completion Image - Daily mode only, hidden on standalone */}
      {!isArchive && !isStandaloneAlchemy && (
        <motion.div
          className="mb-1 -mt-1"
          initial={!reduceMotion ? { opacity: 0, scale: 0.8 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <Image
            src="/game/daily-alchemy/complete.webp"
            alt="Puzzle Complete"
            width={84}
            height={84}
            className="w-[84px] h-[84px]"
            priority
          />
        </motion.div>
      )}

      {/* Congrats Message */}
      <motion.div
        className="text-center mb-4"
        initial={!reduceMotion ? { opacity: 0, scale: 0.9 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2
          className={cn(
            'text-2xl sm:text-3xl font-bold',
            'bg-gradient-to-r from-soup-primary to-soup-hover bg-clip-text text-transparent'
          )}
        >
          {completionStats?.congratsMessage ||
            getRandomMessage(coopMode ? COOP_CONGRATS_MESSAGES : CONGRATS_MESSAGES)}
        </h2>
      </motion.div>

      {/* Created Element Box */}
      <motion.div
        className={cn(
          'flex flex-col items-center justify-center p-4 mb-6',
          'bg-white dark:bg-gray-800',
          'border-[2px] border-black',
          'rounded-xl',
          'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
          'w-full max-w-sm',
          highContrast && 'border-[3px]'
        )}
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {coopMode ? 'You both created' : 'You created'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{targetEmoji}</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{targetElement}</span>
        </div>
        {winningCombination && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {winningCombination.elementA} {winningCombination.operator || '+'}{' '}
            {winningCombination.elementB}
          </div>
        )}
      </motion.div>

      {/* Stats Grid - Time, Par, and Hints */}
      <motion.div
        className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6"
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StatCard iconSrc="/ui/stats/stopwatch.png" label="Time" value={formatTime(elapsedTime)} />
        <StatCard iconSrc="/ui/stats/par.png" label="Par" value={parText} highlight={isUnderPar} />
        <StatCard iconSrc="/ui/shared/hint.png" label="Hints" value={hintsUsed} />
      </motion.div>

      {/* First Discoveries List */}
      {firstDiscoveryElements && firstDiscoveryElements.length > 0 && (
        <motion.div
          className={cn(
            'w-full max-w-sm mb-6 p-4',
            'bg-gradient-to-r from-yellow-100 to-orange-100',
            'dark:from-yellow-900/30 dark:to-orange-900/30',
            'border-[2px] border-black',
            'rounded-xl',
            'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
            highContrast && 'border-[3px]'
          )}
          initial={!reduceMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2 text-yellow-700 dark:text-yellow-400 font-semibold text-sm">
            <Image
              src="/ui/stats/discovery.png"
              alt=""
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span>Your First Discoveries</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {firstDiscoveryElements.map((el, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium shadow-sm"
              >
                {el}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Share Button */}
      <motion.div
        className="w-full max-w-sm"
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={handleShare}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-3',
            'bg-soup-primary text-white',
            'border-[3px] border-black',
            'rounded-xl font-bold',
            'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
            'hover:bg-soup-hover',
            'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
            'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
            'transition-all duration-150',
            !copied && !reduceMotion && 'animate-attention-pulse',
            highContrast && 'border-[4px]'
          )}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              <span>Copied!</span>
            </>
          ) : (
            <span>Share Results</span>
          )}
        </button>
      </motion.div>

      {/* Co-op: Continue Creative Mode Together section */}
      {coopMode && (
        <motion.div
          className="w-full max-w-sm mt-6"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          {coopContinueState === 'choosing' && countdown > 0 && (
            <div
              className={cn(
                'p-5',
                'bg-indigo-50 dark:bg-indigo-950/30',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-2xl',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                highContrast && 'border-[4px]'
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Continue playing Creative Mode together?
                </span>
              </div>

              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleCoopYes}
                  className={cn(
                    'flex-1 py-3',
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
                  Yes
                </button>
                <button
                  onClick={handleCoopNo}
                  className={cn(
                    'flex-1 py-3',
                    'bg-white dark:bg-gray-800',
                    'text-gray-800 dark:text-gray-200',
                    'border-[3px] border-black dark:border-gray-600',
                    'rounded-xl font-bold',
                    'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'hover:translate-y-[-1px]',
                    'active:translate-y-0 active:shadow-none',
                    'transition-all duration-150'
                  )}
                >
                  No
                </button>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {countdown}s to decide
              </p>
            </div>
          )}

          {coopContinueState === 'waiting' && (
            <div
              className={cn(
                'p-5 text-center',
                'bg-indigo-50 dark:bg-indigo-950/30',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-2xl',
                'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
                highContrast && 'border-[4px]'
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Waiting for {coopPartner?.username || 'partner'}...
                </span>
              </div>

              {countdown > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {countdown}s remaining
                </p>
              )}

              <button
                onClick={handleCoopNo}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Solo-only buttons (hidden in co-op) */}
      {!coopMode && (
        <>
          {/* Leaderboard Button */}
          <motion.div
            className="w-full max-w-sm mt-3"
            initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <button
              onClick={() => setShowLeaderboard(true)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3',
                'bg-gray-200 dark:bg-gray-700',
                'text-gray-800 dark:text-gray-200',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-xl font-bold',
                'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]',
                'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]',
                'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
                'transition-all duration-150',
                highContrast && 'border-[4px]'
              )}
            >
              Leaderboard
            </button>
          </motion.div>

          {/* Play Archive Button */}
          {onViewArchive && (
            <motion.div
              className="w-full max-w-sm mt-3"
              initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={onViewArchive}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-6 py-3',
                  'bg-gray-200 dark:bg-gray-700',
                  'text-gray-800 dark:text-gray-200',
                  'border-[3px] border-black dark:border-gray-600',
                  'rounded-xl font-bold',
                  'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]',
                  'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]',
                  'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
                  'transition-all duration-150',
                  highContrast && 'border-[4px]'
                )}
              >
                {!hasSubscription && (
                  <Image
                    src="/ui/shared/lock.png"
                    alt="Locked"
                    width={20}
                    height={20}
                    className="opacity-70"
                  />
                )}
                <span>Play Archive</span>
              </button>
            </motion.div>
          )}

          {/* Creative Mode Section */}
          <motion.div
            className="w-full max-w-sm flex items-center gap-3 my-5"
            initial={!reduceMotion ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or</span>
            <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
          </motion.div>

          {/* Creative Mode Button */}
          <motion.button
            onClick={handleFreePlayClick}
            className={cn(
              'w-full max-w-sm flex items-center justify-center gap-2 py-3',
              'bg-white dark:bg-gray-800',
              'text-gray-800 dark:text-gray-200',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-xl font-bold',
              'shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
              'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
              'transition-all duration-150',
              highContrast && 'border-[4px] border-hc-border'
            )}
            initial={!reduceMotion ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {!hasSubscription && (
              <Image
                src="/ui/shared/lock.png"
                alt="Locked"
                width={20}
                height={20}
                className="opacity-70"
              />
            )}
            <span>Play Creative Mode</span>
          </motion.button>

          {/* Discord Link */}
          <motion.a
            href="https://discord.com/invite/uSxtYQXtHN"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'w-full max-w-sm mt-6 p-4',
              'flex items-center gap-3',
              'bg-gray-50 dark:bg-gray-800',
              'border-[3px] border-gray-300 dark:border-gray-600',
              'rounded-xl',
              'shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'hover:border-gray-400 dark:hover:border-gray-500',
              'transition-colors cursor-pointer'
            )}
            initial={!reduceMotion ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            {/* Discord Logo */}
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-[#5865F2] flex-shrink-0"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
            </svg>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-[#5865F2]">Join us on Discord</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-soup-primary text-black rounded">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share your favorite discoveries and combos, or report bugs
              </p>
            </div>
          </motion.a>
        </>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="soup"
        initialTab="daily"
      />

      {/* Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default DailyAlchemyCompleteScreen;
