'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Starfield } from './Starfield';

/**
 * DailyAlchemyBackground - White background with animated starfield constellation
 */
export function DailyAlchemyBackground({ className }) {
  const { highContrast } = useTheme();

  // For high contrast mode, use solid background
  if (highContrast) {
    return <div className={cn('absolute inset-0 -z-10 bg-hc-background', className)} />;
  }

  return (
    <div className={cn('absolute inset-0 -z-10 bg-white dark:bg-gray-900', className)}>
      <Starfield />
    </div>
  );
}

export default DailyAlchemyBackground;
