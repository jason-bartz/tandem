-- =====================================================
-- ADD ELEMENT SOUP BOT LEADERBOARD SUPPORT
-- Add soup game support to bot leaderboard configuration
-- =====================================================

-- Add soup columns to bot_leaderboard_config
ALTER TABLE bot_leaderboard_config
ADD COLUMN IF NOT EXISTS soup_entries_per_day INTEGER DEFAULT 20 NOT NULL;

ALTER TABLE bot_leaderboard_config
ADD COLUMN IF NOT EXISTS soup_min_score INTEGER DEFAULT 60 NOT NULL;

ALTER TABLE bot_leaderboard_config
ADD COLUMN IF NOT EXISTS soup_max_score INTEGER DEFAULT 600 NOT NULL;

-- Update the insert_bot_leaderboard_score function to accept 'soup' game type
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
  -- Validate game type (now includes soup)
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  -- Insert bot entry (no user_id, no rate limiting)
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
    NULL,  -- No user_id for bots
    p_game_type,
    'daily_speed',
    p_puzzle_date,
    p_score,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Update the insert_bot_streak_entry function to accept 'soup' game type
DROP FUNCTION IF EXISTS insert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, DATE, JSONB);

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
  -- Validate game type (now includes soup)
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
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

-- Update the upsert_bot_streak_entry function to accept 'soup' game type
DROP FUNCTION IF EXISTS upsert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION upsert_bot_streak_entry(
  p_game_type TEXT,
  p_streak_days INTEGER,
  p_bot_username TEXT,
  p_bot_avatar_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Validate game type (now includes soup)
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  -- Try to update existing streak entry for this bot
  UPDATE leaderboard_entries
  SET
    score = p_streak_days,
    metadata = p_metadata,
    puzzle_date = v_today,
    updated_at = NOW()
  WHERE game_type = p_game_type
    AND leaderboard_type = 'best_streak'
    AND is_bot = TRUE
    AND bot_username = p_bot_username
  RETURNING id INTO v_entry_id;

  -- If no existing entry, insert a new one
  IF v_entry_id IS NULL THEN
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
      v_today,
      p_streak_days,
      p_metadata,
      TRUE,
      p_bot_username,
      p_bot_avatar_id
    )
    RETURNING id INTO v_entry_id;
  END IF;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION insert_bot_leaderboard_score IS 'Insert a synthetic daily leaderboard entry (supports soup game)';
COMMENT ON FUNCTION insert_bot_streak_entry IS 'Insert a synthetic streak leaderboard entry with puzzle date (supports soup game)';
COMMENT ON FUNCTION upsert_bot_streak_entry IS 'Upsert a synthetic streak leaderboard entry (supports soup game)';
