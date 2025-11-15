'use client';

/**
 * First Time Account Success Modal
 *
 * Shown after a user successfully creates an account for the FIRST time.
 * Congratulates them, highlights benefits of a free account, and prompts
 * them to select their avatar (optional - can skip for now).
 *
 * Follows Apple Human Interface Guidelines:
 * - Clear visual hierarchy
 * - Engaging welcome message
 * - Consistent spacing (8pt grid)
 * - Prominent call-to-action with optional skip
 *
 * @component
 */

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import BottomPanel from '@/components/shared/BottomPanel';
import AvatarSelectionPane from '@/components/AvatarSelectionPane';
import avatarService from '@/services/avatar.service';

export default function FirstTimeAccountSuccessModal({ isOpen, onClose, userId }) {
  const { refreshProfile } = useAuth();
  const [showAvatarSelection, setShowAvatarSelection] = useState(false); // Start with welcome screen
  const { highContrast } = useTheme();
  const { lightTap, correctAnswer: successHaptic } = useHaptics();

  // Don't render if no userId (not authenticated)
  if (!userId) {
    return null;
  }

  /**
   * Handle CTA button click - open avatar selection
   */
  const handleSelectAvatar = () => {
    lightTap();
    setShowAvatarSelection(true);
  };

  /**
   * Handle skip button click - complete setup without avatar
   */
  const handleSkip = async () => {
    lightTap();

    // Mark first-time setup as complete without selecting avatar
    try {
      await avatarService.markFirstTimeSetupComplete(userId);
    } catch (err) {
      console.error('[FirstTimeAccountSuccessModal] Failed to mark setup complete:', err);
    }

    // Close modal
    onClose();
  };

  /**
   * Handle avatar selection completion
   * @param {string} avatarId - Selected avatar ID
   */
  const handleAvatarSelected = async (avatarId) => {
    // Close the avatar selection modal first
    setShowAvatarSelection(false);

    if (!avatarId) {
      // User skipped - just close everything immediately
      onClose();
      return;
    }

    // Avatar was selected - close immediately to prevent flash
    successHaptic();
    onClose();

    // Refresh profile in AuthContext to update sidebar display (in background)
    await refreshProfile();

    // Mark first-time setup as complete (in background)
    try {
      await avatarService.markFirstTimeSetupComplete(userId);
    } catch (err) {
      // Non-critical error - avatar is already saved, continue anyway
      console.error('[FirstTimeAccountSuccessModal] Failed to mark setup complete:', err);
    }
  };

  const benefits = [
    {
      iconPath: '/icons/ui/cryptic.png',
      title: 'All Game Modes',
      description: 'Play Tandem, Daily Cryptic, and Daily Mini',
    },
    {
      iconPath: '/icons/ui/leaderboard.png',
      title: 'Leaderboards',
      description: 'Compete with players worldwide',
    },
    {
      iconPath: '/icons/ui/stats.png',
      title: 'Stats Tracking',
      description: 'Track your progress across all devices',
    },
    {
      iconPath: '/icons/ui/medal.png',
      title: 'Achievements',
      description: 'Unlock badges and celebrate milestones',
    },
  ];

  return (
    <>
      <BottomPanel
        isOpen={isOpen && !showAvatarSelection}
        onClose={handleSkip}
        title="Account Created Successfully!"
        maxHeight="80vh"
        maxWidth="440px"
        disableSwipe={false}
        disableBackdropClick={false}
        disableEscape={false}
      >
        <div className="px-4 pb-6">
          {/* Subheading */}
          <p
            className={`text-center text-sm mb-4 ${
              highContrast ? 'text-hc-text/80' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Your free account includes access to:
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`p-3 rounded-2xl border-[3px] ${
                  highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-8 h-8 flex-shrink-0 relative">
                    <Image
                      src={benefit.iconPath}
                      alt=""
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <h3
                    className={`font-bold text-sm leading-tight ${
                      highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {benefit.title}
                  </h3>
                  <p
                    className={`text-xs leading-snug ${
                      highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Avatar Selection Prompt */}
          <div
            className={`p-4 rounded-2xl border-[3px] mb-5 ${
              highContrast
                ? 'bg-hc-primary/10 border-hc-primary'
                : 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-300 dark:border-purple-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 flex-shrink-0 relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600">
                <Image
                  src="/images/avatars/default-profile.png"
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <h3
                className={`font-bold text-base ${
                  highContrast ? 'text-hc-text' : 'text-purple-900 dark:text-purple-200'
                }`}
              >
                Choose Your Avatar
              </h3>
            </div>
            <p
              className={`text-sm leading-snug ${
                highContrast ? 'text-hc-text/80' : 'text-purple-800 dark:text-purple-300'
              }`}
            >
              Select an avatar to represent you on leaderboards and throughout the game.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            {/* Primary CTA - Select Avatar */}
            <button
              onClick={handleSelectAvatar}
              className={`w-full py-3.5 px-6 rounded-2xl border-[3px] font-bold text-base transition-all ${
                highContrast
                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Select My Avatar
            </button>

            {/* Secondary CTA - Skip */}
            <button
              onClick={handleSkip}
              className={`w-full py-3 px-6 rounded-2xl font-medium text-sm transition-all ${
                highContrast
                  ? 'text-hc-text/70 hover:text-hc-text hover:underline'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline'
              }`}
            >
              Skip for now
            </button>
          </div>
        </div>
      </BottomPanel>

      {/* Avatar Selection Pane - Opens when CTA is clicked */}
      <AvatarSelectionPane
        isOpen={showAvatarSelection}
        onClose={handleAvatarSelected}
        userId={userId}
        currentAvatarId={null}
        isFirstTime={true}
      />
    </>
  );
}
