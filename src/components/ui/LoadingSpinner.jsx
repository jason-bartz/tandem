'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * LoadingSpinner - Unified spinner component
 *
 * Usage:
 * - Inside buttons: <LoadingSpinner size="small" />
 * - Inline sections: <LoadingSpinner size="medium" text="Loading..." />
 * - Section-level: <LoadingSpinner size="large" text="Loading puzzle..." />
 *
 * Color defaults to current text color (border-current).
 * Pass `color` prop to override (e.g., "border-accent-yellow").
 */
export default function LoadingSpinner({ size = 'medium', text = null, color = 'border-current' }) {
  const { reduceMotion } = useTheme();

  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  // When reduce motion is on, show static text instead of spinner
  if (reduceMotion) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2"
        role="status"
        aria-label="Loading"
      >
        <p className="text-text-secondary font-medium text-sm">{text || 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-label="Loading"
    >
      <div
        className={`${sizeClasses[size]} ${color} border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="text-text-secondary font-medium text-sm">{text}</p>}
    </div>
  );
}
