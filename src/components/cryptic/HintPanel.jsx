'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

export default function HintPanel({ hints }) {
  const { highContrast, theme } = useTheme();

  const hintTypeLabels = {
    fodder: 'Fodder',
    indicator: 'Indicator',
    definition: 'Definition',
    letter: 'First Letter',
  };

  const getHintIcon = (type) => {
    const isDark = theme === 'dark';
    const icons = {
      fodder: isDark ? '/icons/ui/fodder-dark.png' : '/icons/ui/fodder.png',
      indicator: isDark ? '/icons/ui/indicator-dark.png' : '/icons/ui/indicator.png',
      definition: isDark ? '/icons/ui/definition-dark.png' : '/icons/ui/definition.png',
      letter: isDark ? '/icons/ui/letter-dark.png' : '/icons/ui/letter.png',
    };
    return icons[type] || (isDark ? '/icons/ui/fodder-dark.png' : '/icons/ui/fodder.png');
  };

  const hintTypeColors = {
    fodder: {
      bg: 'bg-accent-blue/10 dark:bg-blue-900/20',
      border: 'border-accent-blue',
      text: 'text-accent-blue dark:text-blue-400'
    },
    indicator: {
      bg: 'bg-accent-green/10 dark:bg-green-900/20',
      border: 'border-accent-green',
      text: 'text-accent-green dark:text-green-400'
    },
    definition: {
      bg: 'bg-accent-yellow/10 dark:bg-yellow-900/20',
      border: 'border-accent-yellow',
      text: 'text-accent-yellow dark:text-yellow-400'
    },
    letter: {
      bg: 'bg-accent-pink/10 dark:bg-pink-900/20',
      border: 'border-accent-pink',
      text: 'text-accent-pink dark:text-pink-400'
    },
  };

  const defaultColors = {
    bg: 'bg-gray-50 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300'
  };

  return (
    <div className="space-y-3">
      {hints.map((hint, index) => {
        const colors = hintTypeColors[hint.type] || defaultColors;
        return (
          <div
            key={index}
            className={`p-4 rounded-2xl border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] animate-slideIn ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : `${colors.bg} ${colors.border}`
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                <Image
                  src={getHintIcon(hint.type)}
                  alt=""
                  width={32}
                  height={32}
                />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${
                  highContrast ? 'text-hc-text' : colors.text
                }`}>
                  Hint {index + 1}: {hintTypeLabels[hint.type] || 'Hint'}
                </div>
                <div className={`text-sm font-medium ${
                  highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                }`}>
                  {hint.text}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
