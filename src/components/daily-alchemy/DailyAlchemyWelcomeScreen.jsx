'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import PaywallModal from '@/components/PaywallModal';
import AuthModal from '@/components/auth/AuthModal';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * DailyAlchemyWelcomeScreen - Initial screen before game starts
 * Redesigned with hero target card, 4-column element grid, and full-width CTA
 */
export function DailyAlchemyWelcomeScreen({
  formattedDate: _formattedDate,
  targetElement,
  targetEmoji,
  parMoves,
  onStart,
  onStartFreePlay,
  onStartCoop,
  onOpenHowToPlay,
  isArchive = false,
  puzzleNumber,
  hasSavedProgress = false,
  onResume,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const { user } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleFreePlayClick = () => {
    if (hasSubscription) {
      onStartFreePlay?.();
    } else {
      setShowPaywall(true);
    }
  };

  const handleCoopClick = () => {
    if (!user) {
      if (isStandaloneAlchemy) {
        // On standalone, show auth modal (co-op requires login, but no paywall)
        setShowAuthModal(true);
      } else {
        setShowPaywall(true);
      }
      return;
    }
    if (hasSubscription) {
      onStartCoop?.();
    } else {
      setShowPaywall(true);
    }
  };

  return (
    <div className="flex flex-col items-center w-full px-4 pb-8">
      {/* Archive Badge */}
      {isArchive && (
        <motion.div
          className="mb-3 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm"
          initial={!reduceMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Puzzle #{puzzleNumber}
        </motion.div>
      )}

      {/* Hero Target Card */}
      <motion.div
        className={cn(
          'w-full max-w-sm p-5 mb-6',
          'bg-soup-light/50 dark:bg-soup-primary/10',
          'border-[3px] border-black dark:border-gray-600',
          'rounded-2xl',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
          highContrast && 'border-[4px] border-hc-border'
        )}
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Today's Target Label */}
        <div className="text-soup-dark dark:text-soup-primary font-bold text-xs tracking-wider mb-3">
          Today&apos;s Target
        </div>

        {/* Emoji + Title Row */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{targetEmoji}</span>
          <h1
            className={cn(
              'text-2xl font-lilita-one text-gray-900 dark:text-white',
              highContrast && 'text-hc-text'
            )}
          >
            {targetElement}
          </h1>
        </div>

        {/* Par and Timer Display */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Image src="/ui/stats/par.png" alt="" width={16} height={16} />
            <span>Par: {parMoves} moves</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Image src="/ui/stats/stopwatch.png" alt="" width={16} height={16} />
            <span>10:00 limit</span>
          </div>
        </div>
      </motion.div>

      {/* How to Play Section - Clickable */}
      <motion.button
        onClick={onOpenHowToPlay}
        className="w-full max-w-sm mb-6 text-left"
        initial={!reduceMotion ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {/* How to Play Label */}
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
          <Info className="w-4 h-4" />
          <span>How to Play</span>
        </div>

        {/* Instructions Box */}
        <div
          className={cn(
            'p-4',
            'bg-gray-50 dark:bg-gray-800',
            'border-[3px] border-gray-300 dark:border-gray-600',
            'rounded-xl',
            'shadow-[3px_3px_0px_rgba(0,0,0,0.15)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
            'text-sm text-gray-600 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'hover:border-gray-400 dark:hover:border-gray-500',
            'transition-colors cursor-pointer'
          )}
        >
          Combine elements to create new ones. Find the target element within 10 minutes.
        </div>
      </motion.button>

      {/* Full-Width Start/Continue Button */}
      <motion.button
        onClick={hasSavedProgress ? onResume : onStart}
        className={cn(
          'w-full max-w-sm flex items-center justify-center gap-3 py-4',
          'bg-soup-primary text-black',
          'border-[3px] border-black',
          'rounded-xl font-bold text-lg',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
          'hover:bg-soup-hover',
          'hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]',
          'active:translate-y-0 active:shadow-none',
          'transition-all duration-150',
          highContrast && 'border-[4px]'
        )}
        initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45 }}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
      >
        <span>{hasSavedProgress ? 'Continue Puzzle' : "Play Today's Puzzle"}</span>
      </motion.button>

      {/* Start Over option when there's saved progress */}
      {hasSavedProgress && (
        <motion.button
          onClick={onStart}
          className="mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          initial={!reduceMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Start Over
        </motion.button>
      )}

      {/* Divider */}
      <motion.div
        className="w-full max-w-sm flex items-center gap-3 my-5"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or</span>
        <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
      </motion.div>

      {/* Co-op Mode Button */}
      <motion.button
        onClick={handleCoopClick}
        className={cn(
          'w-full max-w-sm flex items-center justify-center gap-3 py-4 mb-3',
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
        initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.53 }}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
      >
        {!hasSubscription ? (
          <Image
            src="/ui/shared/lock.png"
            alt="Locked"
            width={20}
            height={20}
            className="opacity-70 invert"
          />
        ) : (
          <Users className="w-5 h-5" />
        )}
        <span>Co-op Mode</span>
      </motion.button>

      {/* Co-op Mode Description */}
      <motion.p
        className="w-full max-w-sm text-center text-sm text-gray-500 dark:text-gray-400 mb-3 px-4"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.56 }}
      >
        Combine elements together with a friend in real time.
      </motion.p>

      {/* Creative Mode Button */}
      <motion.button
        onClick={handleFreePlayClick}
        className={cn(
          'w-full max-w-sm flex items-center justify-center gap-3 py-4',
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
        initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55 }}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
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
        <span>Creative Mode</span>
      </motion.button>

      {/* Creative Mode Description */}
      <motion.p
        className="w-full max-w-sm text-center text-sm text-gray-500 dark:text-gray-400 mt-3 px-4"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Combine elements endlessly with no goal or timer. Just pure discovery.
      </motion.p>

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
            Find a co-op partner, share discoveries, report bugs, and more
          </p>
        </div>
      </motion.a>

      {/* Footer - standalone only (no social icons) */}
      {isStandaloneAlchemy && (
        <motion.footer
          className="w-full max-w-sm mt-8 pt-4 text-center"
          initial={!reduceMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2026 Good Vibes Games
            <span className="mx-2">·</span>
            <a href="/privacypolicy" className="underline hover:opacity-70 transition-opacity">
              Privacy Policy
            </a>
          </p>
        </motion.footer>
      )}

      {/* Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Auth Modal for standalone co-op login */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          onStartCoop?.();
        }}
      />
    </div>
  );
}

export default DailyAlchemyWelcomeScreen;
