'use client';

/**
 * First Time Account Success Modal
 *
 * Shown after a user successfully creates an account for the FIRST time.
 * Congratulates them, highlights benefits of a free account, prompts
 * them to create a username, and then select their avatar.
 *
 * Follows Apple Human Interface Guidelines:
 * - Clear visual hierarchy
 * - Engaging welcome message
 * - Consistent spacing (8pt grid)
 * - Prominent call-to-action with optional skip
 * - Inline username creation for streamlined onboarding
 *
 * @component
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHaptics } from '@/hooks/useHaptics';
import BottomPanel from '@/components/shared/BottomPanel';
import AvatarSelectionPane from '@/components/AvatarSelectionPane';
import avatarService from '@/services/avatar.service';
import { generateRandomUsername } from '@/utils/usernameGenerator';
import { validateUsername } from '@/utils/profanityFilter';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import logger from '@/lib/logger';

export default function FirstTimeAccountSuccessModal({ isOpen, onClose, userId }) {
  const { refreshProfile } = useAuth();
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { highContrast } = useTheme();
  const { lightTap, correctAnswer: successHaptic } = useHaptics();

  // Generate random username when modal opens
  useEffect(() => {
    if (isOpen && !username) {
      setUsername(generateRandomUsername());
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUsernameError('');
      setIsSaving(false);
    }
  }, [isOpen]);

  // Don't render if no userId (not authenticated)
  if (!userId) {
    return null;
  }

  /**
   * Handle username input change - sanitize to allowed characters
   */
  const handleUsernameChange = (e) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(sanitized);
    setUsernameError(''); // Clear error on change
  };

  /**
   * Generate a new random username
   */
  const handleGenerateUsername = () => {
    lightTap();
    setUsername(generateRandomUsername());
    setUsernameError('');
  };

  /**
   * Save username and proceed to avatar selection
   */
  const handleSaveAndSelectAvatar = async () => {
    lightTap();
    setUsernameError('');

    // Validate username
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameError(validation.error);
      return;
    }

    setIsSaving(true);

    try {
      // Save username via API
      const apiUrl = getApiUrl('/api/account/username');
      const response = await capacitorFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUsernameError(data.error || 'Failed to save username');
        setIsSaving(false);
        return;
      }

      // Success - refresh profile and proceed to avatar selection
      await refreshProfile();
      successHaptic();
      setShowAvatarSelection(true);
    } catch (error) {
      logger.error('[FirstTimeAccountSuccessModal] Failed to save username', error);
      setUsernameError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
      logger.error('[FirstTimeAccountSuccessModal] Failed to mark setup complete', err);
    }
  };

  const benefits = [
    {
      iconPath: '/icons/ui/tandem.png',
      title: 'All Game Modes',
      description: 'Play Tandem and Daily Mini',
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
        onClose={() => {}} // Modal is non-skippable - users must complete setup
        title="Account Created Successfully!"
        maxHeight="80vh"
        maxWidth="440px"
        showCloseButton={false}
        disableSwipe={true}
        disableBackdropClick={true}
        disableEscape={true}
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

          {/* Username Creation Section */}
          <div
            className={`p-4 rounded-2xl border-[3px] mb-4 ${
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700'
            }`}
          >
            <h3
              className={`font-bold text-base mb-2 ${
                highContrast ? 'text-hc-text' : 'text-blue-900 dark:text-blue-200'
              }`}
            >
              Create Your Username
            </h3>
            <p
              className={`text-sm leading-snug mb-3 ${
                highContrast ? 'text-hc-text/80' : 'text-blue-800 dark:text-blue-300'
              }`}
            >
              This will be displayed on leaderboards.
            </p>

            {/* Username Input with Dice Button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className={`flex-1 px-4 py-3 rounded-xl border-2 text-base focus:outline-none focus:ring-2 transition-colors ${
                  usernameError
                    ? 'border-red-500 focus:ring-red-500'
                    : highContrast
                      ? 'border-hc-border bg-hc-background text-hc-text focus:ring-hc-focus'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500'
                }`}
                placeholder="your_username"
                minLength={3}
                maxLength={20}
                disabled={isSaving}
                aria-label="Username"
                aria-invalid={!!usernameError}
                aria-describedby={usernameError ? 'username-error' : undefined}
              />
              <button
                type="button"
                onClick={handleGenerateUsername}
                disabled={isSaving}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${
                  isSaving
                    ? 'opacity-50 cursor-not-allowed'
                    : highContrast
                      ? 'border-hc-border bg-hc-surface hover:bg-hc-focus'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                aria-label="Generate random username"
                title="Generate random username"
              >
                <Image
                  src="/icons/ui/dice.png"
                  alt=""
                  width={24}
                  height={24}
                  className="dark:hidden"
                />
                <Image
                  src="/icons/ui/dice-dark.png"
                  alt=""
                  width={24}
                  height={24}
                  className="hidden dark:block"
                />
              </button>
            </div>

            {/* Error Message */}
            {usernameError && (
              <p
                id="username-error"
                className="mt-2 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {usernameError}
              </p>
            )}

            {/* Helper Text */}
            <p
              className={`mt-2 text-xs ${
                highContrast ? 'text-hc-text/60' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              3-20 characters. Letters, numbers, and underscores only.
            </p>
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

          {/* CTA Button */}
          <button
            onClick={handleSaveAndSelectAvatar}
            disabled={isSaving || !username.trim()}
            className={`w-full py-3.5 px-6 rounded-2xl border-[3px] font-bold text-base transition-all ${
              isSaving || !username.trim() ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Saving...
              </span>
            ) : (
              'Save & Select Avatar'
            )}
          </button>
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
