import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import logger from '@/lib/logger';

class AvatarService {
  /**
   * Get all available avatars
   *
   * @returns {Promise<Array>} List of active avatars sorted by display order
   * @throws {Error} If database query fails
   */
  async getAllAvatars() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        logger.error('[AvatarService] Failed to fetch avatars', error);
        throw new Error('Failed to load avatars. Please try again.');
      }

      return data || [];
    } catch (error) {
      logger.error('[AvatarService] getAllAvatars error', error);
      throw error;
    }
  }

  /**
   * Get a specific avatar by ID
   *
   * @param {string} avatarId - Avatar ID to fetch
   * @returns {Promise<Object|null>} Avatar data or null if not found
   * @throws {Error} If database query fails
   */
  async getAvatarById(avatarId) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .eq('id', avatarId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        logger.error('[AvatarService] Failed to fetch avatar', error);
        throw new Error('Failed to load avatar details.');
      }

      return data;
    } catch (error) {
      logger.error('[AvatarService] getAvatarById error', error);
      throw error;
    }
  }

  /**
   * Update user's selected avatar
   *
   * @param {string} userId - User ID
   * @param {string} avatarId - Avatar ID to select
   * @returns {Promise<Object>} Updated user data
   * @throws {Error} If update fails or user unauthorized
   */
  async updateUserAvatar(userId, avatarId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!avatarId) {
        throw new Error('Avatar ID is required');
      }

      const supabase = getSupabaseBrowserClient();

      // CRITICAL: Verify auth session is established and matches userId
      // This fixes race condition on iOS where signInWithIdToken returns
      // but the Supabase client hasn't synced the session yet
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        logger.error('[AvatarService] Auth error', authError);
        throw new Error('Authentication error. Please sign in again.');
      }

      if (!authData?.user) {
        logger.error('[AvatarService] No authenticated user found', null);
        throw new Error('Not authenticated. Please sign in again.');
      }

      if (authData.user.id !== userId) {
        logger.error('[AvatarService] User ID mismatch', null, {
          authUserId: authData.user.id,
          passedUserId: userId,
        });
        throw new Error('Authentication mismatch. Please sign in again.');
      }

      logger.debug('[AvatarService] Auth verified for user', userId);

      // First verify the avatar exists and is active
      const avatar = await this.getAvatarById(avatarId);
      if (!avatar) {
        throw new Error('Selected avatar is not available');
      }

      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, selected_avatar_id')
        .eq('id', userId)
        .maybeSingle();

      if (userCheckError) {
        logger.error('[AvatarService] Error checking user', userCheckError);
      }

      logger.debug('[AvatarService] User check result', { existingUser, userCheckError });

      if (!existingUser) {
        logger.warn('[AvatarService] User not found in users table, creating...', { userId });
        // Try to create the user first
        const { error: createError } = await supabase.from('users').insert({
          id: userId,
          email: authData.user.email,
          username: authData.user.user_metadata?.username || null,
        });

        if (createError && createError.code !== '23505') {
          logger.error('[AvatarService] Failed to create user', createError);
          // If insert fails, the database trigger should handle it
          // Wait a moment for trigger to complete then retry
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          logger.debug('[AvatarService] User created successfully or already exists');
        }
      } else {
        logger.debug('[AvatarService] User exists in database');
      }

      logger.debug('[AvatarService] Updating avatar to', avatarId);

      const { data, error } = await supabase
        .from('users')
        .update({
          selected_avatar_id: avatarId,
          avatar_selected_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) {
        logger.error('[AvatarService] Failed to update avatar - Full error', error, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(
          `Database error: ${error.message || 'Failed to save avatar selection. Please try again.'}`
        );
      }

      if (!data) {
        logger.error('[AvatarService] No user found to update avatar for', null, { userId });
        throw new Error('User profile not found. Please try signing in again.');
      }

      return data;
    } catch (error) {
      logger.error('[AvatarService] updateUserAvatar error', error);
      throw error;
    }
  }

  /**
   * Get user profile with avatar details (includes JOIN)
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User profile with avatar data or null if not found
   * @throws {Error} If database query fails
   */
  async getUserProfileWithAvatar(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const supabase = getSupabaseBrowserClient();

      // Direct query instead of RPC to avoid function type mismatch issues
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(
          'id, email, username, avatar_url, selected_avatar_id, avatar_selected_at, created_at'
        )
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        logger.error('[AvatarService] Failed to fetch user profile', userError);
        throw new Error('Failed to load user profile.');
      }

      if (!userData) {
        return null;
      }

      // If user has selected an avatar, fetch avatar details
      let avatarData = null;
      if (userData.selected_avatar_id) {
        const { data: avatar, error: avatarError } = await supabase
          .from('avatars')
          .select('id, display_name, image_path')
          .eq('id', userData.selected_avatar_id)
          .eq('is_active', true)
          .maybeSingle();

        if (!avatarError && avatar) {
          avatarData = avatar;
        }
      }

      // Combine user data with avatar data
      return {
        ...userData,
        avatar_display_name: avatarData?.display_name || null,
        avatar_image_path: avatarData?.image_path || null,
      };
    } catch (error) {
      logger.error('[AvatarService] getUserProfileWithAvatar error', error);
      throw error;
    }
  }

  /**
   * Clear user's avatar selection
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user data
   * @throws {Error} If update fails
   */
  async clearUserAvatar(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('users')
        .update({
          selected_avatar_id: null,
          avatar_selected_at: null,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('[AvatarService] Failed to clear avatar', error);
        throw new Error('Failed to clear avatar selection.');
      }

      return data;
    } catch (error) {
      logger.error('[AvatarService] clearUserAvatar error', error);
      throw error;
    }
  }

  /**
   * Check if user has selected an avatar
   *
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user has avatar, false otherwise
   */
  async hasAvatar(userId) {
    try {
      if (!userId) {
        return false;
      }

      const profile = await this.getUserProfileWithAvatar(userId);
      return !!profile?.selected_avatar_id;
    } catch (error) {
      logger.error('[AvatarService] hasAvatar error', error);
      return false;
    }
  }

  /**
   * Mark user's first-time setup as complete
   *
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   * @throws {Error} If update fails
   */
  async markFirstTimeSetupComplete(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const supabase = getSupabaseBrowserClient();

      // Verify auth session is established
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        logger.warn('[AvatarService] Auth not available for markFirstTimeSetupComplete');
        // Non-critical - return silently as this is a nice-to-have flag
        return;
      }

      if (authData.user.id !== userId) {
        logger.warn('[AvatarService] User ID mismatch in markFirstTimeSetupComplete');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ has_completed_first_time_setup: true })
        .eq('id', userId);

      if (error) {
        logger.error('[AvatarService] Failed to mark first-time setup complete', error);
        // Don't throw - this is a non-critical update
      } else {
        logger.debug('[AvatarService] First-time setup marked complete');
      }
    } catch (error) {
      logger.error('[AvatarService] markFirstTimeSetupComplete error', error);
      // Don't throw - this is a non-critical update
    }
  }

  /**
   * Check if user has completed first-time setup
   *
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if setup complete, false otherwise
   */
  async hasCompletedFirstTimeSetup(userId) {
    try {
      if (!userId) {
        return false;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('users')
        .select('has_completed_first_time_setup, selected_avatar_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('[AvatarService] Failed to check first-time setup status', error);
        // If column doesn't exist (migration not run), fall back to checking if they have an avatar
        if (error.code === '42703') {
          return await this.hasSelectedAvatar(userId);
        }
        return false;
      }

      // Check the flag first, but fall back to checking if they have an avatar
      // This handles cases where the flag might not be set but they've already selected an avatar
      const hasCompletedFlag = data?.has_completed_first_time_setup ?? false;
      const hasAvatar = !!data?.selected_avatar_id;

      const result = hasCompletedFlag || hasAvatar;

      return result;
    } catch (error) {
      logger.error('[AvatarService] hasCompletedFirstTimeSetup error', error);
      return false;
    }
  }

  /**
   * Helper method to check if user has selected an avatar
   * Used as fallback when has_completed_first_time_setup column doesn't exist
   *
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user has an avatar, false otherwise
   */
  async hasSelectedAvatar(userId) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('users')
        .select('selected_avatar_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('[AvatarService] Failed to check if user has avatar', error);
        return false;
      }

      return !!data?.selected_avatar_id;
    } catch (error) {
      logger.error('[AvatarService] hasSelectedAvatar error', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AvatarService();
