-- =====================================================
-- FIX BOT STREAK UPSERT
-- Creates a proper upsert function for bot streak entries
-- that maintains ONE entry per bot per game (not per date)
-- =====================================================

-- STEP 1: Clean up duplicate bot streak entries FIRST (before creating unique index)
-- Keep only the highest streak per bot per game
WITH ranked_streaks AS (
  SELECT
    id,
    bot_username,
    game_type,
    score,
    ROW_NUMBER() OVER (
      PARTITION BY bot_username, game_type
      ORDER BY score DESC, created_at DESC
    ) as rn
  FROM leaderboard_entries
  WHERE is_bot = TRUE
    AND bot_username IS NOT NULL
    AND leaderboard_type = 'best_streak'
),
duplicates AS (
  SELECT id FROM ranked_streaks WHERE rn > 1
)
DELETE FROM leaderboard_entries
WHERE id IN (SELECT id FROM duplicates);

-- STEP 2: Create a unique index for bot streak entries WITHOUT puzzle_date
-- This ensures each bot has only ONE best_streak entry per game
-- (Different from daily_speed which is per-date)
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_entries_bot_streak_unique_idx
ON leaderboard_entries (bot_username, game_type)
WHERE is_bot = TRUE
  AND bot_username IS NOT NULL
  AND leaderboard_type = 'best_streak';

-- STEP 3: Create the upsert function for bot streak entries
-- This will INSERT a new entry or UPDATE an existing one
DROP FUNCTION IF EXISTS upsert_bot_streak_entry(TEXT, INTEGER, TEXT, TEXT, JSONB);

CREATE FUNCTION upsert_bot_streak_entry(
  p_game_type TEXT,
  p_streak_days INTEGER,
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

  -- Upsert bot streak entry
  -- Uses the new unique index (bot_username, game_type) for best_streak entries
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
    CURRENT_DATE,  -- Use current date for the entry
    p_streak_days,
    p_metadata,
    TRUE,
    p_bot_username,
    p_bot_avatar_id
  )
  ON CONFLICT (bot_username, game_type)
  WHERE is_bot = TRUE AND bot_username IS NOT NULL AND leaderboard_type = 'best_streak'
  DO UPDATE SET
    score = EXCLUDED.score,  -- Update to new streak value
    puzzle_date = CURRENT_DATE,  -- Update the date to today
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON INDEX leaderboard_entries_bot_streak_unique_idx IS 'Ensures each bot has only ONE best_streak entry per game (not per date)';
COMMENT ON FUNCTION upsert_bot_streak_entry IS 'Insert or update a bot streak entry - maintains single entry per bot per game';
