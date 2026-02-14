-- =====================================================
-- Add country_code / country_flag to users table
-- and update leaderboard RPC functions to return them.
--
-- Country is captured from Vercel's x-vercel-ip-country
-- header whenever a user hits a co-op or leaderboard API.
-- =====================================================

-- 1. Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_flag VARCHAR(8);

-- 2. Recreate leaderboard functions to include country_flag
-- =====================================================

DROP FUNCTION IF EXISTS get_daily_leaderboard(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_streak_leaderboard(TEXT, INTEGER);

-- Daily speed leaderboard (lower score = better)
CREATE FUNCTION get_daily_leaderboard(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  user_id UUID,
  display_name TEXT,
  score INTEGER,
  rank BIGINT,
  submitted_at TIMESTAMPTZ,
  metadata JSONB,
  is_bot BOOLEAN,
  avatar_image_path TEXT,
  country_flag TEXT
) AS $$
BEGIN
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      le.id as entry_id,
      le.user_id,
      COALESCE(le.bot_username, u.username) as display_name,
      le.score,
      RANK() OVER (ORDER BY le.score ASC) as rank,
      le.created_at as submitted_at,
      le.metadata,
      le.is_bot,
      COALESCE(bot_av.image_path, user_av.image_path) as avatar_image_path,
      u.country_flag
    FROM leaderboard_entries le
    LEFT JOIN users u ON le.user_id = u.id
    LEFT JOIN avatars user_av ON u.selected_avatar_id = user_av.id
    LEFT JOIN avatars bot_av ON le.bot_avatar_id = bot_av.id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'daily_speed'
      AND le.puzzle_date = p_puzzle_date
    ORDER BY le.score ASC
  )
  SELECT * FROM ranked_entries
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Best streak leaderboard (higher score = better)
CREATE FUNCTION get_streak_leaderboard(
  p_game_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  user_id UUID,
  display_name TEXT,
  score INTEGER,
  rank BIGINT,
  submitted_at TIMESTAMPTZ,
  metadata JSONB,
  is_bot BOOLEAN,
  avatar_image_path TEXT,
  country_flag TEXT
) AS $$
BEGIN
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      le.id as entry_id,
      le.user_id,
      COALESCE(le.bot_username, u.username) as display_name,
      le.score,
      RANK() OVER (ORDER BY le.score DESC) as rank,
      le.created_at as submitted_at,
      le.metadata,
      le.is_bot,
      COALESCE(bot_av.image_path, user_av.image_path) as avatar_image_path,
      u.country_flag
    FROM leaderboard_entries le
    LEFT JOIN users u ON le.user_id = u.id
    LEFT JOIN avatars user_av ON u.selected_avatar_id = user_av.id
    LEFT JOIN avatars bot_av ON le.bot_avatar_id = bot_av.id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'best_streak'
    ORDER BY le.score DESC
  )
  SELECT * FROM ranked_entries
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
