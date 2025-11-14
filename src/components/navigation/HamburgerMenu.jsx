'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * HamburgerMenu - Animated hamburger menu button
 *
 * Features:
 * - Animates between hamburger and X states
 * - Rotates on click with smooth animation
 * - Minimal styling (no border or background)
 * - Respects reduced motion preferences
 */
export default function HamburgerMenu({ isOpen, onClick, className = '' }) {
  const { reduceMotion } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50 ${className}`}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <motion.div
        className="relative w-6 h-6 flex items-center justify-center"
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {/* Top line */}
        <motion.span
          className="absolute h-0.5 w-6 bg-text-primary rounded-full"
          animate={{
            rotate: isOpen ? 45 : 0,
            y: isOpen ? 0 : -6,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
        />

        {/* Middle line */}
        <motion.span
          className="absolute h-0.5 w-6 bg-text-primary rounded-full"
          animate={{
            opacity: isOpen ? 0 : 1,
            scaleX: isOpen ? 0 : 1,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
        />

        {/* Bottom line */}
        <motion.span
          className="absolute h-0.5 w-6 bg-text-primary rounded-full"
          animate={{
            rotate: isOpen ? -45 : 0,
            y: isOpen ? 0 : 6,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </motion.div>
    </button>
  );
}
