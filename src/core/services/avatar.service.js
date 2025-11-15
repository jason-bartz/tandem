import logger from '@/utils/helpers/logger';
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
        logger.error('Failed to fetch avatars', error);
        throw new Error('Failed to load avatars. Please try again.');
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching all avatars', error);
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
        logger.error('Failed to fetch avatar by ID', error);
        throw new Error('Failed to load avatar details.');
      }

      return data;
    } catch (error) {
      logger.error('Error fetching avatar by ID', error);
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

      logger.debug('Updating user avatar', { userId, avatarId });

      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, selected_avatar_id')
        .eq('id', userId)
        .maybeSingle();

      if (userCheckError) {
        logger.error('Error checking user existence', userCheckError);
      }

      if (!existingUser) {
        logger.warn('User not found in users table, creating profile', { userId });
        // Try to create the user first
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          logger.debug('Creating user profile');
          const { error: createError } = await supabase.from('users').insert({
            id: userId,
            email: userData.user.email,
            username: userData.user.user_metadata?.username || null,
          });

          if (createError && createError.code !== '23505') {
            logger.error('Failed to create user profile', createError);
          }
        }
      }

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
        logger.error('Failed to update avatar', error, {
          code: error.code,
          userId,
        });
        throw new Error(
          `Database error: ${error.message || 'Failed to save avatar selection. Please try again.'}`
        );
      }

      if (!data) {
        logger.error('No user found to update avatar', null, { userId });
        throw new Error('User profile not found. Please try signing in again.');
      }

      logger.debug('Avatar updated successfully', { userId, avatarId });

      return data;
    } catch (error) {
      logger.error('Error updating user avatar', error);
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
        logger.error('Failed to fetch user profile', userError);
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
      logger.error('Error getting user profile with avatar', error);
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
        logger.error('Failed to clear avatar', error);
        throw new Error('Failed to clear avatar selection.');
      }

      logger.debug('Avatar cleared successfully', { userId });

      return data;
    } catch (error) {
      logger.error('Error clearing user avatar', error);
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
      logger.error('Error checking if user has avatar', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AvatarService();
