'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { EvolutionaryBackground } from './EvolutionaryBackground';

/**
 * DailyAlchemyBackground - Evolutionary emoji background that shifts with gameplay progress
 */
export function DailyAlchemyBackground({
  className,
  mode = 'welcome',
  progress = 0,
  recentEmojis = [],
}) {
  const { highContrast } = useTheme();

  // For high contrast mode, use solid background
  if (highContrast) {
    return <div className={cn('absolute inset-0 -z-10 bg-hc-background', className)} />;
  }

  return (
    <div className={cn('absolute inset-0 -z-10 bg-bg-card dark:bg-gray-900', className)}>
      <EvolutionaryBackground mode={mode} progress={progress} recentEmojis={recentEmojis} />
    </div>
  );
}

export default DailyAlchemyBackground;
