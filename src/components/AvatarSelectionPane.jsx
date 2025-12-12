'use client';

/**
 * Avatar Selection Pane
 *
 * Bottom-sliding panel for selecting or changing user avatar.
 * Features a grid of avatars (4 per row) that expands to show details.
 *
 * Follows Apple Human Interface Guidelines:
 * - Slides from bottom for easy thumb access
 * - Clear visual hierarchy
 * - Dismissible with click-off
 * - Loading and error states
 * - Haptic feedback on interactions
 *
 * @component
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import avatarService from '@/services/avatar.service';
import BottomPanel from '@/components/shared/BottomPanel';
import logger from '@/lib/logger';

export default function AvatarSelectionPane({
  isOpen,
  onClose,
  userId,
  currentAvatarId = null,
  isFirstTime = false,
}) {
  const [avatars, setAvatars] = useState([]);
  const [expandedAvatar, setExpandedAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { highContrast } = useTheme();
  const { correctAnswer: successHaptic, incorrectAnswer: errorHaptic, lightTap } = useHaptics();

  // Load avatars when pane opens
  useEffect(() => {
    if (isOpen) {
      loadAvatars();
      setError(null);
      setExpandedAvatar(null); // Reset expanded view when opening
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentAvatarId]);

  /**
   * Load all available avatars from database
   */
  const loadAvatars = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await avatarService.getAllAvatars();
      setAvatars(data);
    } catch (err) {
      logger.error('[AvatarSelectionPane] Failed to load avatars', err);
      setError('Failed to load avatars. Please try again.');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle avatar card click - opens expanded view
   * @param {string} avatarId - ID of avatar to view
   */
  const handleAvatarClick = (avatarId) => {
    setExpandedAvatar(avatarId);
    lightTap();
  };

  /**
   * Go back to grid view
   */
  const handleBack = () => {
    setExpandedAvatar(null);
    lightTap();
  };

  /**
   * Confirm avatar selection and save to database
   */
  const handleConfirm = async () => {
    if (!userId || !expandedAvatar) {
      setError('User not authenticated or no avatar selected');
      errorHaptic();
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Save avatar to database
      await avatarService.updateUserAvatar(userId, expandedAvatar);

      // Avatar saved successfully
      successHaptic();

      // Close pane and pass selected avatar back
      onClose(expandedAvatar);
    } catch (err) {
      logger.error('[AvatarSelectionPane] Failed to save avatar', err);

      if (err.message && err.message.includes('quota')) {
        // Avatar was likely saved to DB, just local storage failed
        logger.warn('[AvatarSelectionPane] Storage quota warning (non-critical)');
        // Still consider it a success - avatar is saved in database
        successHaptic();
        onClose(expandedAvatar);
      } else {
        // Actual error with avatar save
        setError(err.message || 'Failed to save avatar. Please try again.');
        errorHaptic();
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * Close pane without saving
   */
  const handleClose = () => {
    lightTap();
    onClose?.(null);
  };

  // Get expanded avatar data
  const expandedAvatarData = expandedAvatar ? avatars.find((a) => a.id === expandedAvatar) : null;

  return (
    <BottomPanel
      isOpen={isOpen}
      onClose={isFirstTime ? () => {} : handleClose} // Non-skippable for first-time users
      title={
        expandedAvatar
          ? expandedAvatarData?.display_name || 'Avatar'
          : isFirstTime
            ? 'Choose Your Avatar'
            : 'Change Your Avatar'
      }
      maxHeight="85vh"
      maxWidth="600px"
      showCloseButton={!isFirstTime}
      disableBackdropClick={isFirstTime}
      disableSwipe={isFirstTime}
      disableEscape={isFirstTime}
    >
      {/* Error Message */}
      {error && (
        <div
          className={`mb-4 p-4 rounded-2xl border-[2px] ${
            highContrast
              ? 'bg-hc-error/10 border-hc-error'
              : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-700'
          }`}
          role="alert"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading avatars...</p>
        </div>
      )}

      {/* Grid View - Show all avatars */}
      {!loading && !expandedAvatar && avatars.length > 0 && (
        <>
          {!isFirstTime && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
              Select an avatar to represent you!
            </p>
          )}
          <div className="grid grid-cols-4 gap-3 pb-4">
            {avatars.map((avatar) => {
              const isSelected = currentAvatarId === avatar.id;

              return (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarClick(avatar.id)}
                  className={`py-3 px-2 rounded-2xl border-[3px] transition-all cursor-pointer hover:scale-[1.05] ${
                    isSelected
                      ? highContrast
                        ? 'bg-hc-primary border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                        : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-purple-500 shadow-[4px_4px_0px_rgba(147,51,234,0.5)]'
                      : highContrast
                        ? 'bg-hc-surface border-hc-border hover:bg-hc-focus shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 shadow-[2px_2px_0px_rgba(0,0,0,0.2)] hover:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]'
                  }`}
                  aria-label={`View ${avatar.display_name}`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    {/* Avatar Image */}
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-[3px] border-black dark:border-white shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,1)]">
                      <Image
                        src={avatar.image_path}
                        alt={avatar.display_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                        priority={avatar.sort_order <= 4}
                      />
                    </div>

                    {/* Avatar Name */}
                    <h3
                      className={`font-bold text-xs leading-tight text-center ${
                        isSelected
                          ? highContrast
                            ? 'text-white'
                            : 'text-purple-700 dark:text-purple-300'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {avatar.display_name}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Expanded View - Show single avatar with bio */}
      {!loading && expandedAvatar && expandedAvatarData && (
        <div className="flex flex-col items-center text-center px-4 py-6">
          {/* Avatar Image */}
          <div className="relative w-48 h-48 mb-6 rounded-3xl overflow-hidden border-[3px] border-black dark:border-white shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(255,255,255,1)]">
            <Image
              src={expandedAvatarData.image_path}
              alt={expandedAvatarData.display_name}
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>

          {/* Bio */}
          <div
            className={`text-base leading-relaxed max-w-md mb-8 ${
              highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {expandedAvatarData.bio}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-md">
            {/* Back Button */}
            <button
              onClick={handleBack}
              disabled={saving}
              className={`flex-1 py-4 px-6 rounded-2xl border-[3px] font-bold text-base transition-all ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                highContrast
                  ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-ghost-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Back
            </button>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={saving}
              className={`flex-1 py-4 px-6 rounded-2xl border-[3px] font-bold text-base transition-all ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                highContrast
                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-purple-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </span>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && avatars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No avatars available</p>
          <button
            onClick={loadAvatars}
            className={`py-2 px-4 rounded-xl border-[2px] font-medium text-sm transition-all ${
              highContrast
                ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus'
                : 'bg-sky-500 text-white border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]'
            }`}
          >
            Retry
          </button>
        </div>
      )}
    </BottomPanel>
  );
}
