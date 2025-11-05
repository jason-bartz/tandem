-- =====================================================
-- User Profile with Avatar Function - Migration 010
-- =====================================================
-- This migration creates a function to fetch user profile
-- data along with selected avatar information including username
--
-- Created: 2025-11-05
-- =====================================================

-- =====================================================
-- DROP EXISTING FUNCTION IF IT EXISTS
-- =====================================================
-- Drop the old function to allow changing the return type

DROP FUNCTION IF EXISTS get_user_profile_with_avatar(UUID);

-- =====================================================
-- CREATE get_user_profile_with_avatar FUNCTION
-- =====================================================
-- Fetches user profile with joined avatar data for efficient querying

CREATE OR REPLACE FUNCTION get_user_profile_with_avatar(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  selected_avatar_id UUID,
  avatar_selected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  avatar_display_name TEXT,
  avatar_image_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.full_name,
    u.username,
    u.avatar_url,
    u.selected_avatar_id,
    u.avatar_selected_at,
    u.created_at,
    a.display_name as avatar_display_name,
    a.image_path as avatar_image_path
  FROM users u
  LEFT JOIN avatars a ON u.selected_avatar_id = a.id AND a.is_active = true
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_profile_with_avatar TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
