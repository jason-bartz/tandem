'use client';

/**
 * Avatar Selection Modal
 *
 * Modal for selecting or changing user avatar.
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

export default function AvatarSelectionModal({
  isOpen,
  onClose,
  userId,
  currentAvatarId = null,
  isFirstTime = false,
}) {
  const [avatars, setAvatars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatarId);
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
      setSelectedAvatar(currentAvatarId); // Reset selection to current
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
   * Handle avatar selection
   * @param {string} avatarId - ID of selected avatar
   */
  const handleSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    setExpandedAvatar(null); // Collapse any expanded card
    lightTap();
  };

  /**
   * Toggle expanded state for avatar card
   * @param {string} avatarId - ID of avatar to expand/collapse
   */
  const toggleExpanded = (avatarId, e) => {
    e.stopPropagation(); // Don't trigger selection
    setExpandedAvatar(expandedAvatar === avatarId ? null : avatarId);
    lightTap();
  };

  /**
   * Confirm avatar selection and save to database
   */
  const handleConfirm = async () => {
    if (!selectedAvatar) {
      setError('Please select an avatar');
      errorHaptic();
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      errorHaptic();
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Save avatar to database
      await avatarService.updateUserAvatar(userId, selectedAvatar);

      // Avatar saved successfully
      successHaptic();

      // Close modal and pass selected avatar back
      onClose(selectedAvatar);
    } catch (err) {
      console.error('[AvatarSelectionModal] Failed to save avatar:', err);

      // Check if it's a quota error (non-critical for avatar system)
      if (err.message && err.message.includes('quota')) {
        // Avatar was likely saved to DB, just local storage failed
        console.warn('[AvatarSelectionModal] Storage quota warning (non-critical)');
        // Still consider it a success - avatar is saved in database
        successHaptic();
        onClose(selectedAvatar);
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
   * Skip avatar selection (first-time only)
   */
  const handleSkip = () => {
    lightTap();
    onClose(null);
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 animate-fadeIn"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-modal-title"
    >
      <div
        className={`rounded-[32px] border-[3px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar shadow-[8px_8px_0px_rgba(0,0,0,1)] ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Apple HIG: Clear title with optional close button */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8" /> {/* Spacer for center alignment */}
            <h2
              id="avatar-modal-title"
              className="text-3xl font-bold text-gray-800 dark:text-gray-200"
            >
              {isFirstTime ? 'Choose Your Avatar' : 'Change Your Avatar'}
            </h2>
            {!isFirstTime && (
              <button
                onClick={handleClose}
                className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
                }`}
                aria-label="Close modal"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Select an avatar to represent you!
          </p>
        </div>

        {/* Error Message - Apple HIG: Clear error feedback */}
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

        {/* Loading State - Apple HIG: Activity indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading avatars...</p>
          </div>
        )}

        {/* Avatar Grid - Apple HIG: 8pt grid system, consistent spacing */}
        {!loading && avatars.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {avatars.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;

                return (
                  <div
                    key={avatar.id}
                    className={`p-4 rounded-2xl border-[3px] transition-all ${
                      isSelected
                        ? highContrast
                          ? 'bg-hc-primary border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
                          : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-purple-500 shadow-[6px_6px_0px_rgba(147,51,234,0.5)]'
                        : highContrast
                          ? 'bg-hc-surface border-hc-border hover:bg-hc-focus shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.3)]'
                    }`}
                  >
                    <button
                      onClick={() => handleSelect(avatar.id)}
                      className="w-full text-left"
                      aria-pressed={isSelected}
                      aria-label={`Select ${avatar.display_name}`}
                    >
                      <div className="flex flex-col items-center">
                        {/* Avatar Image - Rounded corners */}
                        <div className="relative w-20 h-20 mb-3 rounded-2xl overflow-hidden">
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
                          className={`font-bold text-lg mb-1 ${
                            isSelected
                              ? highContrast
                                ? 'text-white'
                                : 'text-purple-700 dark:text-purple-300'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {avatar.display_name}
                        </h3>

                        {/* Avatar Bio - Truncated */}
                        <p
                          className={`text-xs text-center line-clamp-3 ${
                            isSelected
                              ? highContrast
                                ? 'text-white/90'
                                : 'text-purple-900 dark:text-purple-200'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {avatar.bio}
                        </p>

                        {/* Selection Indicator - Apple HIG: Clear visual feedback */}
                        {isSelected && (
                          <div className="mt-2">
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                                highContrast
                                  ? 'bg-white text-hc-primary'
                                  : 'bg-purple-500 text-white'
                              }`}
                            >
                              <span className="text-xs font-bold">✓ Selected</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={(e) => toggleExpanded(avatar.id, e)}
                      className={`w-full mt-2 text-xs font-medium ${
                        isSelected
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-sky-600 dark:text-sky-400'
                      } hover:underline`}
                      aria-label="Show full bio"
                    >
                      ▼ Full bio
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Expanded Avatar Popup Overlay */}
            {expandedAvatar && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-60 animate-fadeIn"
                onClick={() => setExpandedAvatar(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="expanded-avatar-title"
              >
                <div
                  className={`rounded-[32px] border-[3px] p-6 max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] animate-scaleIn ${
                    highContrast
                      ? 'bg-hc-surface border-hc-border'
                      : selectedAvatar === expandedAvatar
                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-purple-500'
                        : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const avatar = avatars.find((a) => a.id === expandedAvatar);
                    if (!avatar) return null;
                    const isSelected = selectedAvatar === avatar.id;

                    return (
                      <>
                        {/* Close button */}
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={() => setExpandedAvatar(null)}
                            className={`w-8 h-8 rounded-xl border-[2px] text-lg cursor-pointer transition-all flex items-center justify-center ${
                              highContrast
                                ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
                            }`}
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>

                        {/* Avatar content */}
                        <div className="flex flex-col items-center text-center">
                          {/* Avatar Image */}
                          <div className="relative w-32 h-32 mb-4 rounded-2xl overflow-hidden">
                            <Image
                              src={avatar.image_path}
                              alt={avatar.display_name}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          </div>

                          {/* Avatar Name */}
                          <h3
                            id="expanded-avatar-title"
                            className={`font-bold text-2xl mb-3 ${
                              isSelected
                                ? highContrast
                                  ? 'text-white'
                                  : 'text-purple-700 dark:text-purple-300'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {avatar.display_name}
                          </h3>

                          {/* Full Bio */}
                          <p
                            className={`text-sm mb-4 ${
                              isSelected
                                ? highContrast
                                  ? 'text-white/90'
                                  : 'text-purple-900 dark:text-purple-200'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {avatar.bio}
                          </p>

                          {/* Selection Indicator or Select Button */}
                          {isSelected ? (
                            <div
                              className={`inline-flex items-center gap-1 px-3 py-2 rounded-full ${
                                highContrast
                                  ? 'bg-white text-hc-primary'
                                  : 'bg-purple-500 text-white'
                              }`}
                            >
                              <span className="text-sm font-bold">✓ Selected</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                handleSelect(avatar.id);
                                setExpandedAvatar(null);
                              }}
                              className={`py-2 px-6 rounded-xl border-[3px] font-semibold transition-all ${
                                highContrast
                                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                              }`}
                            >
                              Select {avatar.display_name}
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
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

        {/* Action Buttons - Apple HIG: Primary and secondary actions */}
        {!loading && avatars.length > 0 && (
          <div className="flex gap-3 pt-2">
            {/* Skip Button (First-time only) - Apple HIG: Secondary action on left */}
            {isFirstTime && (
              <button
                onClick={handleSkip}
                disabled={saving}
                className={`flex-1 py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                }`}
              >
                Skip for Now
              </button>
            )}

            {/* Confirm Button - Apple HIG: Primary action on right */}
            <button
              onClick={handleConfirm}
              disabled={!selectedAvatar || saving}
              className={`flex-1 py-3 px-4 rounded-2xl border-[3px] font-semibold transition-all ${
                !selectedAvatar || saving ? 'opacity-50 cursor-not-allowed' : ''
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
        )}
      </div>
    </div>
  );
}
