'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * ElementSoupBackground - Animated gradient background for Element Soup
 * Subtle, slowly shifting green gradients that work in light and dark mode
 */
export function ElementSoupBackground({ className }) {
  const { reduceMotion, highContrast } = useTheme();

  // For high contrast mode, use solid background
  if (highContrast) {
    return <div className={cn('absolute inset-0 -z-10 bg-hc-background', className)} />;
  }

  return (
    <div className={cn('absolute inset-0 -z-10 overflow-hidden', className)}>
      {/* Base gradient layer */}
      <motion.div
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
        animate={
          !reduceMotion
            ? {
                backgroundPosition: ['0% 0%', '100% 100%', '0% 100%', '100% 0%', '0% 0%'],
              }
            : {}
        }
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Floating gradient blobs for subtle movement */}
      {!reduceMotion && (
        <>
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(134, 239, 172, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)',
              left: '-10%',
              top: '10%',
            }}
            animate={{
              x: ['0%', '15%', '5%', '0%'],
              y: ['0%', '10%', '-5%', '0%'],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.35) 0%, transparent 70%)',
              filter: 'blur(50px)',
              right: '-5%',
              top: '20%',
            }}
            animate={{
              x: ['0%', '-20%', '-5%', '0%'],
              y: ['0%', '15%', '5%', '0%'],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute w-[350px] h-[350px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(126, 217, 87, 0.3) 0%, transparent 70%)',
              filter: 'blur(45px)',
              left: '30%',
              bottom: '10%',
            }}
            animate={{
              x: ['0%', '10%', '-10%', '0%'],
              y: ['0%', '-15%', '5%', '0%'],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      )}

      {/* Dark mode overlay - transforms the light greens to work in dark mode */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: 'rgba(17, 24, 39, 0.92)',
          mixBlendMode: 'normal',
        }}
      />

      {/* Dark mode subtle green glow */}
      {!reduceMotion && (
        <div className="absolute inset-0 hidden dark:block">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.08) 0%, transparent 60%)',
              filter: 'blur(80px)',
              left: '-10%',
              top: '0%',
            }}
            animate={{
              x: ['0%', '20%', '5%', '0%'],
              y: ['0%', '15%', '-5%', '0%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(126, 217, 87, 0.06) 0%, transparent 60%)',
              filter: 'blur(70px)',
              right: '-5%',
              bottom: '10%',
            }}
            animate={{
              x: ['0%', '-15%', '5%', '0%'],
              y: ['0%', '-10%', '10%', '0%'],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ElementSoupBackground;
