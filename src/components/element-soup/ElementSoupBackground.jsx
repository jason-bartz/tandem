'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * ElementSoupBackground - Static gradient background for Element Soup
 * Uses CSS gradients without animations for better performance
 */
export function ElementSoupBackground({ className }) {
  const { highContrast } = useTheme();

  // For high contrast mode, use solid background
  if (highContrast) {
    return <div className={cn('absolute inset-0 -z-10 bg-hc-background', className)} />;
  }

  return (
    <div className={cn('absolute inset-0 -z-10 overflow-hidden', className)}>
      {/* Static gradient layer - no animation for performance */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(126, 217, 87, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(107, 196, 71, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 60% 80%, rgba(134, 239, 172, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 30% 70%, rgba(74, 222, 128, 0.2) 0%, transparent 50%),
            linear-gradient(180deg, rgba(240, 253, 244, 1) 0%, rgba(220, 252, 231, 1) 50%, rgba(187, 247, 208, 1) 100%)
          `,
        }}
      />

      {/* Dark mode overlay - transforms the light greens to work in dark mode */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: 'rgba(17, 24, 39, 0.92)',
          mixBlendMode: 'normal',
        }}
      />

      {/* Dark mode static green glow - no animation */}
      <div className="absolute inset-0 hidden dark:block pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(74, 222, 128, 0.08) 0%, transparent 60%)',
            filter: 'blur(80px)',
            left: '-10%',
            top: '0%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(126, 217, 87, 0.06) 0%, transparent 60%)',
            filter: 'blur(70px)',
            right: '-5%',
            bottom: '10%',
          }}
        />
      </div>
    </div>
  );
}

export default ElementSoupBackground;
