'use client';

/**
 * Avatar Selection Modal
 * NOW USES: LeftSidePanel for consistent slide-in behavior
 *
 * Modal for selecting or changing user avatar.
 * Features nested panel for expanded avatar preview at z-70
 *
 * Follows Apple Human Interface Guidelines:
 * - Clear visual hierarchy
 * - Consistent spacing (8pt grid)
 * - Dismissible with clear actions
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
import LeftSidePanel from '@/components/shared/LeftSidePanel';

export default function AvatarSelectionModal({
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

  // Load avatars when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvatars();
      setError(null);
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
      console.error('[AvatarSelectionModal] Failed to load avatars:', err);
      setError('Failed to load avatars. Please try again.');
      errorHaptic();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle avatar card click - opens expanded bio
   * @param {string} avatarId - ID of avatar to view
   */
  const handleAvatarClick = (avatarId) => {
    setExpandedAvatar(avatarId);
    lightTap();
  };

  /**
   * Confirm avatar selection and save to database (from expanded view)
   */
  const handleConfirmFromExpanded = async (avatarId) => {
    if (!userId) {
      setError('User not authenticated');
      errorHaptic();
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Save avatar to database
      await avatarService.updateUserAvatar(userId, avatarId);

      // Avatar saved successfully
      successHaptic();

      // Close both panels and pass selected avatar back
      setExpandedAvatar(null);
      onClose(avatarId);
    } catch (err) {
      console.error('[AvatarSelectionModal] Failed to save avatar:', err);

      // Check if it's a quota error (non-critical for avatar system)
      if (err.message && err.message.includes('quota')) {
        // Avatar was likely saved to DB, just local storage failed
        console.warn('[AvatarSelectionModal] Storage quota warning (non-critical)');
        // Still consider it a success - avatar is saved in database
        successHaptic();
        setExpandedAvatar(null);
        onClose(avatarId);
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
   * Close modal without saving
   */
  const handleClose = () => {
    if (isFirstTime) {
      // First-time modal requires explicit skip
      return;
    }
    lightTap();
    onClose(null);
  };

  // Get expanded avatar data
  const expandedAvatarData = expandedAvatar ? avatars.find((a) => a.id === expandedAvatar) : null;

  return (
    <>
      <LeftSidePanel
        isOpen={isOpen}
        onClose={!isFirstTime ? handleClose : undefined}
        title={isFirstTime ? 'Choose Your Avatar' : 'Change Your Avatar'}
        subtitle="Select an avatar to represent you!"
        maxWidth="650px"
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

        {/* Avatar Grid */}
        {!loading && avatars.length > 0 && (
          <div className="grid grid-cols-3 gap-3 p-1">
            {avatars.map((avatar) => {
              const isSelected = currentAvatarId === avatar.id;

              return (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarClick(avatar.id)}
                  className={`p-3 rounded-2xl border-[3px] transition-all cursor-pointer hover:scale-[1.02] aspect-square ${
                    isSelected
                      ? highContrast
                        ? 'bg-hc-primary border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                        : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-purple-500 shadow-[6px_6px_0px_rgba(147,51,234,0.5)]'
                      : highContrast
                        ? 'bg-hc-surface border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[5px_5px_0px_rgba(0,0,0,0.3)]'
                  }`}
                  aria-label={`View ${avatar.display_name}`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    {/* Avatar Image - Rounded corners */}
                    <div className="relative w-20 h-20 mb-1 rounded-2xl overflow-hidden flex-shrink-0">
                      <Image
                        src={avatar.image_path}
                        alt={avatar.display_name}
                        fill
                        className="object-cover"
                        sizes="80px"
                        priority={avatar.sort_order <= 4}
                      />
                    </div>

                    {/* Avatar Name - Apple HIG: Clear hierarchy */}
                    <h3
                      className={`font-bold text-base ${
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
      </LeftSidePanel>

      {/* Nested Panel - Avatar Detail Preview at z-70 */}
      {expandedAvatarData && (
        <LeftSidePanel
          isOpen={!!expandedAvatar}
          onClose={() => {
            setExpandedAvatar(null);
            lightTap();
          }}
          title={expandedAvatarData.display_name}
          maxWidth="500px"
          zIndex={70}
          footer={
            <div className="flex gap-4">
              {/* Close Button */}
              <button
                onClick={() => {
                  setExpandedAvatar(null);
                  lightTap();
                }}
                disabled={saving}
                className={`flex-1 py-4 px-6 rounded-2xl border-[3px] font-bold text-base transition-all ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Close
              </button>

              {/* Confirm Button */}
              <button
                onClick={() => handleConfirmFromExpanded(expandedAvatarData.id)}
                disabled={saving}
                className={`flex-1 py-4 px-6 rounded-2xl border-[3px] font-bold text-base transition-all ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  highContrast
                    ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
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
          }
        >
          <div className="flex flex-col items-center text-center px-4 py-6">
            {/* Avatar Image */}
            <div className="relative w-48 h-48 mb-8 rounded-3xl overflow-hidden border-[3px] border-gray-300 dark:border-gray-600 shadow-[6px_6px_0px_rgba(0,0,0,0.2)]">
              <Image
                src={expandedAvatarData.image_path}
                alt={expandedAvatarData.display_name}
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>

            {/* Full Bio */}
            <div
              className={`text-lg leading-relaxed max-w-md ${
                highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {expandedAvatarData.bio}
            </div>
          </div>
        </LeftSidePanel>
      )}
    </>
  );
}
