-- =====================================================
-- Fix Leaderboard Avatars - Production Script
-- =====================================================
-- This script updates the leaderboard functions to properly
-- display user avatars by joining with the avatars table.
--
-- ISSUE: Leaderboards showing default avatars for everyone
-- CAUSE: Functions were reading avatar_url (external URLs) instead
--        of joining avatars table to get selected_avatar_id->image_path
-- FIX: Updated functions to use LEFT JOIN with avatars table
--
-- SAFE TO RUN: This script is idempotent and can be run multiple times
-- HOW TO APPLY: Copy and paste into Supabase Dashboard → SQL Editor → Run
--
-- Created: 2025-11-05
-- =====================================================

-- =====================================================
-- 1. UPDATE get_daily_leaderboard FUNCTION
-- =====================================================

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
-- 3. GRANT PERMISSIONS (ensure access)
-- =====================================================

GRANT EXECUTE ON FUNCTION get_daily_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_streak_leaderboard TO anon, authenticated;

-- =====================================================
-- VERIFICATION QUERY (optional - run to test)
-- =====================================================
-- Uncomment to test that avatars are now being fetched:
--
-- SELECT * FROM get_daily_leaderboard('tandem', CURRENT_DATE, 10);
-- SELECT * FROM get_streak_leaderboard('tandem', 10);
--
-- You should now see avatar_url populated with values like:
-- '/images/avatars/cat.png' (if user selected an avatar)
-- OR '/images/avatars/default-profile.png' (if no avatar selected)
--
-- =====================================================

-- ✅ Migration Complete!
-- Leaderboards will now display player avatars correctly.
