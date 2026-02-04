'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime, getRandomMessage, CONGRATS_MESSAGES } from '@/lib/daily-alchemy.constants';
import confetti from 'canvas-confetti';
import PaywallModal from '@/components/PaywallModal';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';
import LoginReminderPopup from '@/components/shared/LoginReminderPopup';
import AuthModal from '@/components/auth/AuthModal';

/**
 * StatCard - Individual stat display with custom icon image
 */
function StatCard({ iconSrc, label, value, highlight = false }) {
  const { highContrast } = useTheme();

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3',
        'bg-white dark:bg-gray-800',
        'border-[2px] border-black',
        'rounded-xl',
        'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
        highlight && 'bg-soup-light/50 dark:bg-soup-primary/20',
        highContrast && 'border-[3px]'
      )}
    >
      <Image src={iconSrc} alt="" width={24} height={24} className="w-6 h-6" />
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div
          className={cn(
            'font-bold text-gray-900 dark:text-white',
            highlight && 'text-soup-dark dark:text-soup-primary'
          )}
        >
          {value}
        </div>
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
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleFreePlayClick = () => {
    if (hasSubscription) {
      onStartFreePlay?.();
    } else {
      setShowPaywall(true);
    }
  };

  // Calculate par comparison
  const parDiff = movesCount - parMoves;
  const parText =
    parDiff === 0 ? 'At Par!' : parDiff < 0 ? `${parDiff} Under Par!` : `+${parDiff} Over Par`;
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
    <div className="flex flex-col items-center flex-1 overflow-y-auto px-1">
      {/* Login reminder popup for non-authenticated users */}
      {!user && (
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

      {/* Completion Image - Daily mode only */}
      {!isArchive && (
        <motion.div
          className="mb-1 -mt-1"
          initial={!reduceMotion ? { opacity: 0, scale: 0.8 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <Image
            src="/images/dailyalchemy-end.png"
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
          {completionStats?.congratsMessage || getRandomMessage(CONGRATS_MESSAGES)}
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
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">You created</div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{targetEmoji}</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{targetElement}</span>
        </div>
        {winningCombination && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {winningCombination.elementA} + {winningCombination.elementB}
          </div>
        )}
      </motion.div>

      {/* Stats Grid - Time and Par only */}
      <motion.div
        className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6"
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StatCard iconSrc="/icons/ui/stopwatch.png" label="Time" value={formatTime(elapsedTime)} />
        <StatCard iconSrc="/icons/ui/par.png" label="Par" value={parText} highlight={isUnderPar} />
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
              src="/icons/ui/discovery.png"
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
                src="/icons/ui/lock.png"
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
            src="/icons/ui/lock.png"
            alt="Locked"
            width={20}
            height={20}
            className="opacity-70"
          />
        )}
        <span>Play Creative Mode</span>
      </motion.button>

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
