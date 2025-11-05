-- =====================================================
-- QUICK FIX: Drop broken function temporarily
-- =====================================================
-- Run this in Supabase SQL Editor to immediately fix the issue

DROP FUNCTION IF EXISTS get_user_profile_with_avatar(UUID);

-- =====================================================
-- Create simplified version that works with current schema
-- =====================================================
-- This version uses CAST to handle type mismatches

CREATE OR REPLACE FUNCTION get_user_profile_with_avatar(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  selected_avatar_id TEXT,  -- Changed to TEXT to match actual column
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
    u.selected_avatar_id::TEXT,  -- Explicitly cast to TEXT
    u.avatar_selected_at,
    u.created_at,
    a.display_name as avatar_display_name,
    a.image_path as avatar_image_path
  FROM users u
  LEFT JOIN avatars a ON u.selected_avatar_id::UUID = a.id AND a.is_active = true
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_profile_with_avatar(UUID) TO authenticated;
