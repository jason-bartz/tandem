'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * FirstDiscoveryToast - Celebration notification for first discoveries
 * Flat design: solid accent color, no gradients, Lucide icons.
 * Auto-dismisses after timeout or on tap/click.
 */
export function FirstDiscoveryToast({ element, emoji, onDismiss, duration = 5000 }) {
  const { reduceMotion, highContrast } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <motion.div
      className="fixed top-4 left-1/2 z-[100] cursor-pointer"
      initial={!reduceMotion ? { y: -100, x: '-50%', opacity: 0 } : { x: '-50%' }}
      animate={{ y: 0, x: '-50%', opacity: 1 }}
      exit={!reduceMotion ? { y: -100, x: '-50%', opacity: 0 } : { x: '-50%', opacity: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 20 }
      }
      onClick={onDismiss}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-6 py-3',
          'rounded-2xl',
          highContrast
            ? 'bg-hc-warning text-hc-warning-text border-2 border-hc-border'
            : 'bg-flat-accent text-gray-900 border-2 border-flat-accent'
        )}
      >
        <Sparkles className="w-6 h-6 flex-shrink-0" />
        <div>
          <div className="font-bold text-sm">First Discovery!</div>
          <div className="text-xs opacity-90">
            You discovered {emoji} <span className="font-jua">{element}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default FirstDiscoveryToast;
