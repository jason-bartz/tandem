-- =====================================================
-- FIX BOT STREAK ENTRY - ADD PUZZLE DATE PARAMETER
-- The puzzle_date column is NOT NULL, so we need to pass a date
-- =====================================================

-- Drop and recreate insert_bot_streak_entry with puzzle_date parameter
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
    p_puzzle_date,  -- Use provided date instead of NULL
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
