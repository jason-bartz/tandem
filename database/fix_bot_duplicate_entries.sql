-- =====================================================
-- FIX BOT DUPLICATE ENTRIES
-- Add unique constraint to prevent duplicate bot usernames
-- per game/date/leaderboard_type combination
-- =====================================================

-- Create a partial unique index for bot entries
-- This ensures each bot_username can only appear once per game/date/leaderboard_type
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_entries_bot_unique_idx
ON leaderboard_entries (bot_username, game_type, leaderboard_type, puzzle_date)
WHERE is_bot = TRUE AND bot_username IS NOT NULL;

-- Drop and recreate insert_bot_leaderboard_score to handle duplicates gracefully
DROP FUNCTION IF EXISTS insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, TEXT, JSONB);

CREATE FUNCTION insert_bot_leaderboard_score(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_score INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
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

  -- Insert bot entry, skip if duplicate (same username/game/date/type)
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
    'daily_speed',
    p_puzzle_date,
    p_score,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  ON CONFLICT (bot_username, game_type, leaderboard_type, puzzle_date)
  WHERE is_bot = TRUE AND bot_username IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_entry_id;

  -- Return NULL if skipped due to duplicate, otherwise return the new ID
  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate insert_bot_streak_entry to handle duplicates gracefully
DROP FUNCTION IF EXISTS insert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, DATE, JSONB);

CREATE FUNCTION insert_bot_streak_entry(
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

  -- Insert bot streak entry, update score if duplicate exists (take higher streak)
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
  ON CONFLICT (bot_username, game_type, leaderboard_type, puzzle_date)
  WHERE is_bot = TRUE AND bot_username IS NOT NULL
  DO UPDATE SET
    score = GREATEST(leaderboard_entries.score, EXCLUDED.score),
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist (for tracking updates)
ALTER TABLE leaderboard_entries
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON INDEX leaderboard_entries_bot_unique_idx IS 'Ensures each bot username appears only once per game/date/leaderboard_type';
COMMENT ON FUNCTION insert_bot_leaderboard_score IS 'Insert a synthetic daily leaderboard entry, skipping duplicates';
COMMENT ON FUNCTION insert_bot_streak_entry IS 'Insert/update a synthetic streak leaderboard entry';
