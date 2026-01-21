-- =====================================================
-- BOT LEADERBOARD SUPPORT
-- Add support for synthetic leaderboard entries
-- =====================================================

-- Add is_bot column to leaderboard_entries
ALTER TABLE leaderboard_entries
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE NOT NULL;

-- Add bot_username column to leaderboard_entries for bot entries
-- Real users will use the username from the users table
ALTER TABLE leaderboard_entries
ADD COLUMN IF NOT EXISTS bot_username TEXT;

-- Add bot_avatar_id column to store avatar for bot entries (TEXT type to match avatars.id)
ALTER TABLE leaderboard_entries
ADD COLUMN IF NOT EXISTS bot_avatar_id TEXT REFERENCES avatars(id);

-- Make user_id nullable to allow bot entries
ALTER TABLE leaderboard_entries
ALTER COLUMN user_id DROP NOT NULL;

-- Drop the old unique constraint that included user_id
ALTER TABLE leaderboard_entries
DROP CONSTRAINT IF EXISTS leaderboard_entries_user_id_game_type_leaderboard_type_puzz_key;

-- Create a partial unique index that only applies to real users (not bots)
-- This ensures real users can only have one entry per game/type/date, but bots can have many
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_entries_user_unique_idx
ON leaderboard_entries (user_id, game_type, leaderboard_type, puzzle_date)
WHERE user_id IS NOT NULL;

-- Add a check constraint to ensure either user_id is set OR is_bot is true (but not both)
ALTER TABLE leaderboard_entries
ADD CONSTRAINT IF NOT EXISTS leaderboard_entries_user_or_bot_check
CHECK (
  (user_id IS NOT NULL AND is_bot = FALSE) OR
  (user_id IS NULL AND is_bot = TRUE)
);

-- Create bot_leaderboard_config table to store settings
CREATE TABLE IF NOT EXISTS bot_leaderboard_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE NOT NULL,
  min_scores_per_day INTEGER DEFAULT 10 NOT NULL,
  max_scores_per_day INTEGER DEFAULT 30 NOT NULL,

  -- Score ranges for each game (in seconds)
  tandem_min_score INTEGER DEFAULT 30 NOT NULL,
  tandem_max_score INTEGER DEFAULT 300 NOT NULL,

  cryptic_min_score INTEGER DEFAULT 45 NOT NULL,
  cryptic_max_score INTEGER DEFAULT 400 NOT NULL,

  mini_min_score INTEGER DEFAULT 60 NOT NULL,
  mini_max_score INTEGER DEFAULT 600 NOT NULL,

  reel_min_score INTEGER DEFAULT 90 NOT NULL,
  reel_max_score INTEGER DEFAULT 900 NOT NULL,

  -- Timing
  spread_throughout_day BOOLEAN DEFAULT TRUE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default configuration
INSERT INTO bot_leaderboard_config (enabled, min_scores_per_day, max_scores_per_day)
VALUES (FALSE, 10, 30)
ON CONFLICT DO NOTHING;

-- Create index on is_bot for filtering
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_is_bot
ON leaderboard_entries(is_bot);

-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS get_daily_leaderboard(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_streak_leaderboard(TEXT, INTEGER);
DROP FUNCTION IF EXISTS insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, JSONB);
DROP FUNCTION IF EXISTS insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS insert_bot_leaderboard_score(TEXT, DATE, INTEGER, TEXT, TEXT, JSONB);

-- Update get_daily_leaderboard to include bot entries with avatars
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
  rank INTEGER,
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
      RANK() OVER (ORDER BY le.score ASC) as rank,
      le.created_at as submitted_at,
      le.metadata,
      le.is_bot,
      COALESCE(bot_av.image_path, user_av.image_path) as avatar_image_path
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

-- Update get_streak_leaderboard to exclude bot entries
CREATE FUNCTION get_streak_leaderboard(
  p_game_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  user_id UUID,
  display_name TEXT,
  score INTEGER,
  rank INTEGER,
  submitted_at TIMESTAMPTZ,
  metadata JSONB,
  avatar_image_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      le.id as entry_id,
      le.user_id,
      u.username as display_name,
      le.score,
      RANK() OVER (ORDER BY le.score DESC) as rank,
      le.created_at as submitted_at,
      le.metadata,
      av.image_path as avatar_image_path
    FROM leaderboard_entries le
    LEFT JOIN users u ON le.user_id = u.id
    LEFT JOIN avatars av ON u.selected_avatar_id = av.id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'best_streak'
      AND le.is_bot = FALSE  -- Exclude bots from streak leaderboard
    ORDER BY le.score DESC
  )
  SELECT * FROM ranked_entries
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to insert bot leaderboard entries with avatar
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

COMMENT ON TABLE bot_leaderboard_config IS 'Configuration for automated bot leaderboard entries';
COMMENT ON COLUMN leaderboard_entries.is_bot IS 'Whether this entry is from a bot (synthetic user)';
COMMENT ON COLUMN leaderboard_entries.bot_username IS 'Username for bot entries (NULL for real users)';
COMMENT ON FUNCTION insert_bot_leaderboard_score IS 'Insert a synthetic leaderboard entry';
