-- =====================================================
-- Fix Avatar Function Return Type - Migration 011
-- =====================================================
-- This migration fixes the get_user_profile_with_avatar function
-- to properly return user profile data with avatar information.
--
-- Issue: Function was failing with "Returned type text does not match
-- expected type uuid in column 6" error
--
-- Solution:
-- 1. Ensure avatar columns exist on users table
-- 2. Drop and recreate the function with correct return type
--
-- Created: 2025-11-05
-- =====================================================

-- =====================================================
-- STEP 1: ENSURE AVATAR COLUMNS EXIST ON USERS TABLE
-- =====================================================
-- These columns should exist but may be missing in some environments

-- Add selected_avatar_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'selected_avatar_id'
  ) THEN
    ALTER TABLE users ADD COLUMN selected_avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL;
    CREATE INDEX idx_users_selected_avatar_id ON users(selected_avatar_id);
  END IF;
END $$;

-- Add avatar_selected_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'avatar_selected_at'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_selected_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- STEP 2: DROP EXISTING FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS get_user_profile_with_avatar(UUID);

-- =====================================================
-- RECREATE FUNCTION WITH CORRECT RETURN TYPE
-- =====================================================
-- This function joins users with avatars table to get complete profile data

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
GRANT EXECUTE ON FUNCTION get_user_profile_with_avatar(UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The function should now properly return user profile data
-- including selected avatar information
