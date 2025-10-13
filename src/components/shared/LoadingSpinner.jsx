'use client';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoadingSpinner() {
  const { reduceMotion } = useTheme();

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-16 h-16 border-4 border-white/20 border-t-white rounded-full ${
          !reduceMotion ? 'spinner animate-ios-spinner' : ''
        } gpu-accelerated`}
        role="status"
        aria-label="Loading"
      />
      <p
        className={`mt-4 text-white text-lg ${!reduceMotion ? 'progressive-load' : ''}`}
        style={!reduceMotion ? { animationDelay: '200ms' } : {}}
      >
        Loading puzzle...
      </p>
    </div>
  );
}
