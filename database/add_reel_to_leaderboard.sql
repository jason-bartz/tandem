-- =====================================================
-- ADD REEL CONNECTIONS TO LEADERBOARD SYSTEM
-- Run this in Supabase SQL Editor to enable Reel
-- Connections leaderboard functionality
-- =====================================================

-- Step 1: Update the CHECK constraint on leaderboard_entries
-- First, drop the existing constraint
ALTER TABLE leaderboard_entries
DROP CONSTRAINT IF EXISTS leaderboard_entries_game_type_check;

-- Add new constraint that includes 'reel'
ALTER TABLE leaderboard_entries
ADD CONSTRAINT leaderboard_entries_game_type_check
CHECK (game_type IN ('tandem', 'cryptic', 'mini', 'reel'));

-- Step 2: Update submit_leaderboard_score function to accept 'reel'
CREATE OR REPLACE FUNCTION submit_leaderboard_score(
  p_user_id UUID,
  p_game_type TEXT,
  p_leaderboard_type TEXT,
  p_puzzle_date DATE,
  p_score INTEGER,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_existing_score INTEGER;
  v_last_submission TIMESTAMP;
BEGIN
  -- Validate game type (now includes 'reel')
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  -- Validate leaderboard type
  IF p_leaderboard_type NOT IN ('daily_speed', 'best_streak') THEN
    RAISE EXCEPTION 'Invalid leaderboard type: %', p_leaderboard_type;
  END IF;

  -- Check rate limiting (5 seconds between submissions)
  SELECT MAX(updated_at) INTO v_last_submission
  FROM leaderboard_entries
  WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND leaderboard_type = p_leaderboard_type;

  IF v_last_submission IS NOT NULL AND
     v_last_submission > NOW() - INTERVAL '5 seconds' THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before submitting again.';
  END IF;

  -- Check if user has leaderboards disabled
  IF EXISTS (
    SELECT 1 FROM leaderboard_preferences
    WHERE user_id = p_user_id AND enabled = false
  ) THEN
    RAISE EXCEPTION 'Leaderboards disabled for this user';
  END IF;

  -- For daily_speed: lower is better (time in seconds)
  -- For best_streak: higher is better
  IF p_leaderboard_type = 'daily_speed' THEN
    -- Check existing entry for this specific date
    SELECT score INTO v_existing_score
    FROM leaderboard_entries
    WHERE user_id = p_user_id
      AND game_type = p_game_type
      AND leaderboard_type = p_leaderboard_type
      AND puzzle_date = p_puzzle_date;

    IF v_existing_score IS NOT NULL THEN
      -- Only update if new score is better (lower)
      IF p_score < v_existing_score THEN
        UPDATE leaderboard_entries
        SET score = p_score,
            metadata = p_metadata,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND game_type = p_game_type
          AND leaderboard_type = p_leaderboard_type
          AND puzzle_date = p_puzzle_date
        RETURNING id INTO v_entry_id;
      ELSE
        RETURN NULL; -- Score not improved
      END IF;
    ELSE
      -- Insert new entry
      INSERT INTO leaderboard_entries (user_id, game_type, leaderboard_type, puzzle_date, score, metadata)
      VALUES (p_user_id, p_game_type, p_leaderboard_type, p_puzzle_date, p_score, p_metadata)
      RETURNING id INTO v_entry_id;
    END IF;
  ELSE
    -- best_streak: higher is better, puzzle_date is a placeholder
    SELECT score INTO v_existing_score
    FROM leaderboard_entries
    WHERE user_id = p_user_id
      AND game_type = p_game_type
      AND leaderboard_type = p_leaderboard_type;

    IF v_existing_score IS NOT NULL THEN
      -- Only update if new score is better (higher)
      IF p_score > v_existing_score THEN
        UPDATE leaderboard_entries
        SET score = p_score,
            metadata = p_metadata,
            puzzle_date = p_puzzle_date,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND game_type = p_game_type
          AND leaderboard_type = p_leaderboard_type
        RETURNING id INTO v_entry_id;
      ELSE
        RETURN NULL; -- Score not improved
      END IF;
    ELSE
      -- Insert new entry
      INSERT INTO leaderboard_entries (user_id, game_type, leaderboard_type, puzzle_date, score, metadata)
      VALUES (p_user_id, p_game_type, p_leaderboard_type, p_puzzle_date, p_score, p_metadata)
      RETURNING id INTO v_entry_id;
    END IF;
  END IF;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update get_daily_leaderboard function
-- Drop existing function first due to return type change
DROP FUNCTION IF EXISTS get_daily_leaderboard(TEXT, DATE, INTEGER);
CREATE OR REPLACE FUNCTION get_daily_leaderboard(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INTEGER,
  metadata JSONB
) AS $$
BEGIN
  -- Validate game type (now includes 'reel')
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  SELECT
    le.user_id,
    u.username,
    u.avatar_url,
    le.score,
    le.metadata
  FROM leaderboard_entries le
  JOIN users u ON u.id = le.user_id
  LEFT JOIN leaderboard_preferences lp ON lp.user_id = le.user_id
  WHERE le.game_type = p_game_type
    AND le.leaderboard_type = 'daily_speed'
    AND le.puzzle_date = p_puzzle_date
    AND (lp.enabled IS NULL OR lp.enabled = true)
  ORDER BY le.score ASC -- Lower time is better
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update get_streak_leaderboard function
-- Drop existing function first due to return type change
DROP FUNCTION IF EXISTS get_streak_leaderboard(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION get_streak_leaderboard(
  p_game_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INTEGER,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- Validate game type (now includes 'reel')
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  SELECT
    le.user_id,
    u.username,
    u.avatar_url,
    le.score,
    le.updated_at
  FROM leaderboard_entries le
  JOIN users u ON u.id = le.user_id
  LEFT JOIN leaderboard_preferences lp ON lp.user_id = le.user_id
  WHERE le.game_type = p_game_type
    AND le.leaderboard_type = 'best_streak'
    AND (lp.enabled IS NULL OR lp.enabled = true)
  ORDER BY le.score DESC -- Higher streak is better
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update get_user_daily_rank function if it exists
-- Drop existing function first due to return type change
DROP FUNCTION IF EXISTS get_user_daily_rank(UUID, TEXT, DATE);
CREATE OR REPLACE FUNCTION get_user_daily_rank(
  p_user_id UUID,
  p_game_type TEXT,
  p_puzzle_date DATE
)
RETURNS TABLE (
  score INTEGER,
  rank BIGINT
) AS $$
BEGIN
  -- Validate game type (now includes 'reel')
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel') THEN
    RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      le.user_id,
      le.score,
      RANK() OVER (ORDER BY le.score ASC) as rank
    FROM leaderboard_entries le
    LEFT JOIN leaderboard_preferences lp ON lp.user_id = le.user_id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'daily_speed'
      AND le.puzzle_date = p_puzzle_date
      AND (lp.enabled IS NULL OR lp.enabled = true)
  )
  SELECT r.score, r.rank
  FROM ranked r
  WHERE r.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Reel Connections should now work with leaderboards.
