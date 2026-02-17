-- =====================================================
-- Add country flags to bot leaderboard entries
-- Also fixes leaderboard display by recreating all
-- functions cleanly and reloading PostgREST schema.
-- =====================================================

-- 1. Ensure users table has country columns (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_flag VARCHAR(8);

-- 2. Add bot_country_flag to leaderboard_entries
ALTER TABLE leaderboard_entries ADD COLUMN IF NOT EXISTS bot_country_flag VARCHAR(8);

-- =====================================================
-- 3. Recreate leaderboard display functions
--    Now uses COALESCE to show bot country flags too
-- =====================================================

DROP FUNCTION IF EXISTS get_daily_leaderboard(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_streak_leaderboard(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_daily_leaderboard(
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
      COALESCE(le.bot_country_flag, u.country_flag)::TEXT as country_flag
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

CREATE OR REPLACE FUNCTION get_streak_leaderboard(
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
      COALESCE(le.bot_country_flag, u.country_flag)::TEXT as country_flag
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

-- =====================================================
-- 4. Recreate bot insert functions with country flag
-- =====================================================

DROP FUNCTION IF EXISTS public.insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.insert_bot_leaderboard_score(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_score INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_bot_country_flag TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  INSERT INTO public.leaderboard_entries (
    user_id, game_type, leaderboard_type, puzzle_date,
    score, metadata, is_bot, bot_username, bot_avatar_id, bot_country_flag
  ) VALUES (
    NULL, p_game_type, 'daily_speed', p_puzzle_date,
    p_score, p_metadata, TRUE, p_bot_username, p_bot_avatar_id, p_bot_country_flag
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.upsert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_bot_streak_entry(
  p_game_type TEXT,
  p_streak_days INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_bot_country_flag TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  IF p_game_type NOT IN ('tandem', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  INSERT INTO public.leaderboard_entries (
    user_id, game_type, leaderboard_type, puzzle_date,
    score, metadata, is_bot, bot_username, bot_avatar_id, bot_country_flag
  ) VALUES (
    NULL, p_game_type, 'best_streak', CURRENT_DATE,
    p_streak_days, p_metadata, TRUE, p_bot_username, p_bot_avatar_id, p_bot_country_flag
  )
  ON CONFLICT (bot_username, game_type)
  WHERE is_bot = TRUE AND bot_username IS NOT NULL AND leaderboard_type = 'best_streak'
  DO UPDATE SET
    score = EXCLUDED.score,
    puzzle_date = CURRENT_DATE,
    metadata = EXCLUDED.metadata,
    bot_country_flag = EXCLUDED.bot_country_flag,
    updated_at = NOW()
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- =====================================================
-- 5. Reload PostgREST schema cache
-- =====================================================
NOTIFY pgrst, 'reload schema';
