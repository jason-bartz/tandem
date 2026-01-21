-- =====================================================
-- UPDATE STREAK LEADERBOARD FOR BOTS
-- Allow bots to appear in streak leaderboard
-- =====================================================

-- Drop and recreate get_streak_leaderboard to include bots
DROP FUNCTION IF EXISTS get_streak_leaderboard(TEXT, INTEGER);

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
  avatar_image_path TEXT
) AS $$
BEGIN
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
      COALESCE(bot_av.image_path, user_av.image_path) as avatar_image_path
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

-- Create function to insert bot streak entries
DROP FUNCTION IF EXISTS insert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION insert_bot_streak_entry(
  p_game_type TEXT,
  p_streak_days INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_puzzle_date DATE,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- Validate game type
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  -- Insert bot streak entry WITH puzzle_date (required by NOT NULL constraint)
  INSERT INTO leaderboard_entries (
    user_id,
    game_type,
    leaderboard_type,
    puzzle_date,
    score,
    metadata,
    is_bot,
    bot_username,
    bot_avatar_id
  ) VALUES (
    NULL,
    p_game_type,
    'best_streak',
    p_puzzle_date,
    p_streak_days,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_bot_streak_entry IS 'Insert a synthetic streak leaderboard entry with puzzle date';
