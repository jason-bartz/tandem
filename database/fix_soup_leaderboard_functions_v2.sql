-- =====================================================
-- FIX SOUP LEADERBOARD FUNCTIONS V2
-- Restores proper function signatures with bot support
-- and adds 'soup' game type to all leaderboard functions
-- =====================================================

-- Drop existing functions to ensure clean slate
DROP FUNCTION IF EXISTS get_daily_leaderboard(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_streak_leaderboard(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_user_daily_rank(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS submit_leaderboard_score(UUID, TEXT, TEXT, DATE, INTEGER, JSONB);

-- =====================================================
-- 1. RESTORE get_daily_leaderboard with soup support
-- =====================================================
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
  avatar_image_path TEXT
) AS $$
BEGIN
  -- Validate game type (includes 'soup')
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

-- =====================================================
-- 2. RESTORE get_streak_leaderboard with soup support
-- Includes both real users AND bots (no is_bot filter)
-- =====================================================
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
  -- Validate game type (includes 'soup')
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

-- =====================================================
-- 3. RESTORE submit_leaderboard_score with soup support
-- =====================================================
CREATE FUNCTION submit_leaderboard_score(
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
  -- Validate game type (includes 'soup')
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
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

-- =====================================================
-- 4. RESTORE get_user_daily_rank with soup support
-- =====================================================
CREATE FUNCTION get_user_daily_rank(
  p_user_id UUID,
  p_game_type TEXT,
  p_puzzle_date DATE
)
RETURNS TABLE (
  score INTEGER,
  rank BIGINT
) AS $$
BEGIN
  -- Validate game type (includes 'soup')
  IF p_game_type NOT IN ('tandem', 'cryptic', 'mini', 'reel', 'soup') THEN
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

-- =====================================================
-- Verify functions exist
-- =====================================================
SELECT proname, pronargs
FROM pg_proc
WHERE proname IN (
  'submit_leaderboard_score',
  'get_daily_leaderboard',
  'get_streak_leaderboard',
  'get_user_daily_rank'
);
