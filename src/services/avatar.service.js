/**
 * Avatar Service
 *
 * Manages user avatar selection and retrieval.
 * Handles all avatar-related database operations with proper error handling.
 *
 * @module services/avatar.service
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
        .order('sort_order');

      if (error) {
        console.error('[AvatarService] Failed to fetch avatars:', error);
        throw new Error('Failed to load avatars. Please try again.');
      }

      return data || [];
    } catch (error) {
      console.error('[AvatarService] getAllAvatars error:', error);
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
        console.error('[AvatarService] Failed to fetch avatar:', error);
        throw new Error('Failed to load avatar details.');
      }

      return data;
    } catch (error) {
      console.error('[AvatarService] getAvatarById error:', error);
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

      // First verify the avatar exists and is active
      const avatar = await this.getAvatarById(avatarId);
      if (!avatar) {
        throw new Error('Selected avatar is not available');
      }

      console.log('[AvatarService] Attempting to update user:', {
        userId,
        avatarId,
        avatarName: avatar.display_name,
      });

      // Check if user exists in users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, selected_avatar_id')
        .eq('id', userId)
        .maybeSingle();

      if (userCheckError) {
        console.error('[AvatarService] Error checking user:', userCheckError);
      }

      if (!existingUser) {
        console.warn('[AvatarService] User not found in users table:', userId);
        // Try to create the user first
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          console.log('[AvatarService] Creating user profile...');
          const { error: createError } = await supabase.from('users').insert({
            id: userId,
            email: userData.user.email,
            username: userData.user.user_metadata?.username || null,
          });

          if (createError && createError.code !== '23505') {
            console.error('[AvatarService] Failed to create user:', createError);
          }
        }
      } else {
        console.log('[AvatarService] User found:', existingUser);
      }

      // Update user's avatar selection
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
        console.error('[AvatarService] Failed to update avatar - Full error:', {
          error,
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
        console.error('[AvatarService] No user found to update avatar for:', userId);
        throw new Error('User profile not found. Please try signing in again.');
      }

      console.log('[AvatarService] Avatar updated successfully:', {
        userId,
        avatarId,
        avatarName: avatar.display_name,
      });

      return data;
    } catch (error) {
      console.error('[AvatarService] updateUserAvatar error:', error);
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
        console.error('[AvatarService] Failed to fetch user profile:', userError);
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
      console.error('[AvatarService] getUserProfileWithAvatar error:', error);
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
        console.error('[AvatarService] Failed to clear avatar:', error);
        throw new Error('Failed to clear avatar selection.');
      }

      console.log('[AvatarService] Avatar cleared successfully:', { userId });

      return data;
    } catch (error) {
      console.error('[AvatarService] clearUserAvatar error:', error);
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
      console.error('[AvatarService] hasAvatar error:', error);
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
      const { error } = await supabase
        .from('users')
        .update({ has_completed_first_time_setup: true })
        .eq('id', userId);

      if (error) {
        console.error('[AvatarService] Failed to mark first-time setup complete:', error);
        throw new Error('Failed to update first-time setup status.');
      }

      console.log('[AvatarService] First-time setup marked complete for user:', userId);
    } catch (error) {
      console.error('[AvatarService] markFirstTimeSetupComplete error:', error);
      throw error;
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
        .select('has_completed_first_time_setup')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AvatarService] Failed to check first-time setup status:', error);
        return false;
      }

      return data?.has_completed_first_time_setup ?? false;
    } catch (error) {
      console.error('[AvatarService] hasCompletedFirstTimeSetup error:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AvatarService();
