-- =====================================================
-- Fix Leaderboard Avatars - Migration 009
-- =====================================================
-- This migration updates the leaderboard functions to properly
-- fetch avatar images from the avatars table based on selected_avatar_id
--
-- Issue: Leaderboard was showing default avatars only because
-- it was selecting avatar_url (external URLs) instead of
-- joining with the avatars table to get the selected avatar's image_path
--
-- Created: 2025-11-05
-- =====================================================

-- =====================================================
-- 1. UPDATE get_daily_leaderboard FUNCTION
-- =====================================================
-- Now properly joins with avatars table to fetch selected avatar image

CREATE OR REPLACE FUNCTION get_daily_leaderboard(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY le.score ASC) as rank,
    le.user_id,
    COALESCE(u.username, u.full_name, 'Anonymous') as username,
    -- Use selected avatar's image_path, fallback to user's avatar_url, then default
    COALESCE(a.image_path, u.avatar_url, '/images/avatars/default-profile.png') as avatar_url,
    le.score,
    le.metadata,
    le.created_at
  FROM leaderboard_entries le
  JOIN users u ON le.user_id = u.id
  LEFT JOIN avatars a ON u.selected_avatar_id = a.id AND a.is_active = true
  LEFT JOIN leaderboard_preferences lp ON le.user_id = lp.user_id
  WHERE le.game_type = p_game_type
    AND le.leaderboard_type = 'daily_speed'
    AND le.puzzle_date = p_puzzle_date
    AND (lp.enabled IS NULL OR lp.enabled = true)
    AND (lp.show_on_global IS NULL OR lp.show_on_global = true)
  ORDER BY le.score ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. UPDATE get_streak_leaderboard FUNCTION
-- =====================================================
-- Now properly joins with avatars table to fetch selected avatar image

CREATE OR REPLACE FUNCTION get_streak_leaderboard(
  p_game_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY le.score DESC) as rank,
    le.user_id,
    COALESCE(u.username, u.full_name, 'Anonymous') as username,
    -- Use selected avatar's image_path, fallback to user's avatar_url, then default
    COALESCE(a.image_path, u.avatar_url, '/images/avatars/default-profile.png') as avatar_url,
    le.score,
    le.created_at
  FROM leaderboard_entries le
  JOIN users u ON le.user_id = u.id
  LEFT JOIN avatars a ON u.selected_avatar_id = a.id AND a.is_active = true
  LEFT JOIN leaderboard_preferences lp ON le.user_id = lp.user_id
  WHERE le.game_type = p_game_type
    AND le.leaderboard_type = 'best_streak'
    AND (lp.enabled IS NULL OR lp.enabled = true)
    AND (lp.show_on_global IS NULL OR lp.show_on_global = true)
  ORDER BY le.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================
-- Ensure the updated functions are accessible

GRANT EXECUTE ON FUNCTION get_daily_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_streak_leaderboard TO anon, authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Now leaderboards will display:
-- 1. Selected avatar from avatars table (if user has chosen one)
-- 2. External avatar_url (if no avatar selected but URL exists)
-- 3. Default avatar (if neither exists)
-- =====================================================
