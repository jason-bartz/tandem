'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * ReducedMotionImage - Swaps animated GIFs for static images when reduce motion is enabled.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): Animated GIFs bypass CSS reduce-motion rules
 * because they are image-level animation, not CSS animation. This component
 * conditionally renders a static fallback when the user prefers reduced motion.
 *
 * @param {string} src - The animated image source (e.g. "/game/tandem/howto.gif")
 * @param {string} staticSrc - The static fallback image (e.g. "/game/tandem/howto/1.webp")
 * @param {string} alt - Alt text for the image
 * @param {string} [className] - Optional className
 */
export default function ReducedMotionImage({ src, staticSrc, alt, className = '' }) {
  const { reduceMotion } = useTheme();

  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: Next <Image> doesn't support animated GIF swap
    <img src={reduceMotion ? staticSrc : src} alt={alt} className={className} />
  );
}
