'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * SunburstRays - Radial spinning light rays for first discovery celebrations.
 * Uses CSS conic-gradient for GPU-accelerated animation.
 * Mobile: rays cover full screen. Desktop: rays fade out via radial mask.
 */
export function SunburstRays() {
  const { reduceMotion, highContrast } = useTheme();

  if (highContrast) return null;

  if (reduceMotion) {
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 60%)',
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="sunburst-rays animate-sunburst-spin"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200vmax',
          height: '200vmax',
          background: `conic-gradient(
            from 0deg,
            rgba(255, 215, 0, 0.18) 0deg, rgba(255, 215, 0, 0.18) 15deg,
            transparent 15deg, transparent 30deg,
            rgba(255, 215, 0, 0.18) 30deg, rgba(255, 215, 0, 0.18) 45deg,
            transparent 45deg, transparent 60deg,
            rgba(255, 215, 0, 0.18) 60deg, rgba(255, 215, 0, 0.18) 75deg,
            transparent 75deg, transparent 90deg,
            rgba(255, 215, 0, 0.18) 90deg, rgba(255, 215, 0, 0.18) 105deg,
            transparent 105deg, transparent 120deg,
            rgba(255, 215, 0, 0.18) 120deg, rgba(255, 215, 0, 0.18) 135deg,
            transparent 135deg, transparent 150deg,
            rgba(255, 215, 0, 0.18) 150deg, rgba(255, 215, 0, 0.18) 165deg,
            transparent 165deg, transparent 180deg,
            rgba(255, 215, 0, 0.18) 180deg, rgba(255, 215, 0, 0.18) 195deg,
            transparent 195deg, transparent 210deg,
            rgba(255, 215, 0, 0.18) 210deg, rgba(255, 215, 0, 0.18) 225deg,
            transparent 225deg, transparent 240deg,
            rgba(255, 215, 0, 0.18) 240deg, rgba(255, 215, 0, 0.18) 255deg,
            transparent 255deg, transparent 270deg,
            rgba(255, 215, 0, 0.18) 270deg, rgba(255, 215, 0, 0.18) 285deg,
            transparent 285deg, transparent 300deg,
            rgba(255, 215, 0, 0.18) 300deg, rgba(255, 215, 0, 0.18) 315deg,
            transparent 315deg, transparent 330deg,
            rgba(255, 215, 0, 0.18) 330deg, rgba(255, 215, 0, 0.18) 345deg,
            transparent 345deg, transparent 360deg
          )`,
          maskImage:
            'radial-gradient(circle, black 0%, black 15%, transparent var(--sunburst-mask-end, 85%))',
          WebkitMaskImage:
            'radial-gradient(circle, black 0%, black 15%, transparent var(--sunburst-mask-end, 85%))',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      />
    </motion.div>
  );
}

export default SunburstRays;
