'use client';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * DemoContainer - Wrapper for animated game demos.
 *
 * Handles:
 * - Reduced motion: renders a static placeholder instead of animation
 * - Consistent sizing/aspect ratio matching the old GIF slots
 * - Pointer-events disabled (non-interactive)
 * - Dark mode background
 */
export default function DemoContainer({ children, staticContent, className = '' }) {
  const { reduceMotion } = useTheme();

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-bg-card dark:bg-gray-800 pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {reduceMotion ? staticContent || children : children}
    </div>
  );
}
