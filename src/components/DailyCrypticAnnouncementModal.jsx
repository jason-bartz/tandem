'use client';

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

/**
 * DailyCrypticAnnouncementModal - Announces new Daily Cryptic game mode
 * NOW USES: LeftSidePanel for consistent slide-in behavior
 * Note: Converted from scale-in animation to slide-in per design spec
 */
export default function DailyCrypticAnnouncementModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Introducing Daily Cryptic!"
      maxWidth="450px"
      footer={
        <button
          onClick={onClose}
          className={`w-full px-6 py-4 text-white text-base font-bold rounded-[20px] border-[3px] transition-all ${
            highContrast
              ? 'bg-hc-primary border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-hc-focus'
              : 'border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
          }`}
          style={{ backgroundColor: '#cb6ce6' }}
        >
          Got it!
        </button>
      }
    >
      {/* Image with rounded corners */}
      <div className="w-full aspect-square relative overflow-hidden rounded-2xl mb-6">
        <Image
          src="/images/dail-cryptic-message.png"
          alt="Daily Cryptic announcement"
          width={500}
          height={500}
          className="w-full h-full object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="text-center">
        <p
          className={`text-base leading-relaxed mb-4 ${
            highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Challenge yourself with a brand new puzzle game mode! Solve cryptic crossword-style
          clues every day and test your wordplay skills.
        </p>
        <p
          className={`text-lg font-bold ${
            highContrast ? 'text-hc-text' : 'text-purple-600 dark:text-purple-400'
          }`}
        >
          Try it today!
        </p>
      </div>
    </LeftSidePanel>
  );
}
