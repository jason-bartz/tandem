'use client';

/**
 * Avatar Prompt Modal
 *
 * Small modal that prompts users to select an avatar using a preview image.
 * Provides two options: "Select Avatar" or "Skip for Now"
 * NOW USES: LeftSidePanel for consistent slide-in behavior
 *
 * @component
 */

import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import LeftSidePanel from '@/components/shared/LeftSidePanel';

export default function AvatarPromptModal({ isOpen, onSelectAvatar, onSkip }) {
  const { highContrast } = useTheme();
  const { lightTap } = useHaptics();

  const handleSelectAvatar = () => {
    lightTap();
    onSelectAvatar();
  };

  const handleSkip = () => {
    lightTap();
    onSkip();
  };

  return (
    <LeftSidePanel isOpen={isOpen} onClose={handleSkip} title="Choose Your Avatar" maxWidth="420px">
      {/* Subtitle */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
        Pick a character to represent you in the game!
      </p>

      {/* Avatar Grid Image Preview */}
      <div className="mb-6 relative w-full aspect-square rounded-2xl overflow-hidden">
        <Image
          src="/images/avatar-grid.png"
          alt="Available avatars"
          fill
          className="object-cover"
          sizes="(max-width: 448px) 100vw, 448px"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className={`flex-1 py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
            highContrast
              ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
          }`}
        >
          Skip for Now
        </button>

        {/* Select Avatar Button */}
        <button
          onClick={handleSelectAvatar}
          className={`flex-1 py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
            highContrast
              ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
          }`}
        >
          Select Avatar
        </button>
      </div>
    </LeftSidePanel>
  );
}
