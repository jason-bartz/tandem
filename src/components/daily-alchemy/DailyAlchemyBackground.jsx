'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * DailyAlchemyBackground - Solid green background for Daily Alchemy
 * Uses the same soup-primary color as the "Start Mixing" button
 */
export function DailyAlchemyBackground({ className }) {
  const { highContrast } = useTheme();

  // For high contrast mode, use solid background
  if (highContrast) {
    return <div className={cn('absolute inset-0 -z-10 bg-hc-background', className)} />;
  }

  return (
    <div className={cn('absolute inset-0 -z-10 bg-soup-primary dark:bg-soup-dark', className)} />
  );
}

export default DailyAlchemyBackground;
