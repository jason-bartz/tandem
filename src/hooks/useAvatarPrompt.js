/**
 * useAvatarPrompt Hook
 *
 * Manages the first-time avatar selection prompt.
 * Shows modal once after user signs up/in if they don't have an avatar.
 * Uses localStorage to persist dismissal preference.
 *
 * Following Apple HIG:
 * - Non-intrusive timing (waits for initial load)
 * - User can dismiss
 * - Respects user choice (doesn't re-prompt after dismissal)
 *
 * @hook
 */

import { useState, useEffect, useCallback } from 'react';
import avatarService from '@/services/avatar.service';

/**
 * Custom hook for managing avatar selection prompts
 *
 * @param {Object} user - Current authenticated user
 * @param {number} delay - Delay in ms before showing prompt (default: 1000ms)
 * @returns {Object} Prompt state and control methods
 */
export function useAvatarPrompt(user, delay = 1000) {
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Check if user needs to be prompted for avatar selection
   */
  const checkAvatarStatus = useCallback(async () => {
    if (!user?.id || hasChecked || isChecking) {
      return;
    }

    try {
      setIsChecking(true);

      // Check if user has already dismissed the prompt
      const dismissedKey = `avatar_prompt_dismissed_${user.id}`;
      const dismissed = localStorage.getItem(dismissedKey);

      if (dismissed === 'true') {
        console.log('[useAvatarPrompt] Prompt previously dismissed for user:', user.id);
        setHasChecked(true);
        return;
      }

      // Check if user has selected an avatar
      const hasAvatar = await avatarService.hasAvatar(user.id);

      if (!hasAvatar) {
        // Wait for delay before showing prompt (allows game UI to settle)
        setTimeout(() => {
          console.log('[useAvatarPrompt] Showing avatar prompt for user:', user.id);
          setShowAvatarPrompt(true);
        }, delay);
      } else {
        console.log('[useAvatarPrompt] User already has avatar:', user.id);
      }

      setHasChecked(true);
    } catch (error) {
      console.error('[useAvatarPrompt] Failed to check avatar status:', error);
      setHasChecked(true); // Mark as checked to prevent infinite loops
    } finally {
      setIsChecking(false);
    }
  }, [user, hasChecked, isChecking, delay]);

  // Check avatar status when user changes
  useEffect(() => {
    if (user?.id) {
      checkAvatarStatus();
    }
  }, [user?.id, checkAvatarStatus]);

  /**
   * Dismiss the prompt and store preference
   * User won't be prompted again for this account
   */
  const dismissPrompt = useCallback(() => {
    if (!user?.id) return;

    const dismissedKey = `avatar_prompt_dismissed_${user.id}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowAvatarPrompt(false);

    console.log('[useAvatarPrompt] Prompt dismissed by user:', user.id);
  }, [user?.id]);

  /**
   * Close the prompt after avatar selection
   * Resets check state so status can be re-verified
   */
  const closePrompt = useCallback(() => {
    setShowAvatarPrompt(false);
    setHasChecked(false); // Allow re-checking in case avatar was selected

    console.log('[useAvatarPrompt] Prompt closed');
  }, []);

  /**
   * Manually trigger the prompt (useful for testing or re-prompting)
   */
  const triggerPrompt = useCallback(() => {
    if (!user?.id) {
      console.warn('[useAvatarPrompt] Cannot trigger prompt: No user');
      return;
    }

    console.log('[useAvatarPrompt] Manually triggering prompt');
    setShowAvatarPrompt(true);
  }, [user?.id]);

  /**
   * Clear dismissal preference (useful for testing)
   */
  const clearDismissal = useCallback(() => {
    if (!user?.id) return;

    const dismissedKey = `avatar_prompt_dismissed_${user.id}`;
    localStorage.removeItem(dismissedKey);
    setHasChecked(false);

    console.log('[useAvatarPrompt] Dismissal cleared for user:', user.id);
  }, [user?.id]);

  return {
    showAvatarPrompt,
    dismissPrompt,
    closePrompt,
    triggerPrompt,
    clearDismissal,
    isChecking,
    hasChecked,
  };
}

export default useAvatarPrompt;
