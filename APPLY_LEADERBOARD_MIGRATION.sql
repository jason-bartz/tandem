-- =====================================================
-- Safe Leaderboard Migration for Production
-- =====================================================
-- This is an idempotent version of migration 007 that
-- won't fail if parts have already been applied.
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. ADD USERNAME COLUMN (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Create index (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add username format constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'username_format'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT username_format
      CHECK (username IS NULL OR (username ~ '^[a-zA-Z0-9_]{3,20}$'));
  END IF;
END $$;

-- 2. CREATE LEADERBOARD ENTRIES TABLE
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('tandem', 'cryptic')),
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('daily_speed', 'best_streak')),
  puzzle_date DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, game_type, leaderboard_type, puzzle_date)
);

-- Enable RLS
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public leaderboard entries viewable" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON leaderboard_entries;

-- Create RLS policies
CREATE POLICY "Public leaderboard entries viewable"
  ON leaderboard_entries
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own entries"
  ON leaderboard_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND score > 0
    AND score < 7200
  );

CREATE POLICY "Users can update own entries"
  ON leaderboard_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (leaderboard_type = 'daily_speed' AND score < (SELECT score FROM leaderboard_entries WHERE id = leaderboard_entries.id))
      OR
      (leaderboard_type = 'best_streak' AND score > (SELECT score FROM leaderboard_entries WHERE id = leaderboard_entries.id))
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_lookup
  ON leaderboard_entries(game_type, leaderboard_type, puzzle_date, score);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user
  ON leaderboard_entries(user_id, game_type, leaderboard_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score
  ON leaderboard_entries(game_type, leaderboard_type, puzzle_date, score ASC)
  WHERE leaderboard_type = 'daily_speed';
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_streak
  ON leaderboard_entries(game_type, leaderboard_type, score DESC)
  WHERE leaderboard_type = 'best_streak';

-- 3. CREATE LEADERBOARD PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS leaderboard_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  show_on_global BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE leaderboard_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own leaderboard preferences" ON leaderboard_preferences;
DROP POLICY IF EXISTS "Users can insert own leaderboard preferences" ON leaderboard_preferences;
DROP POLICY IF EXISTS "Users can update own leaderboard preferences" ON leaderboard_preferences;

-- Create RLS policies
CREATE POLICY "Users can view own leaderboard preferences"
  ON leaderboard_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leaderboard preferences"
  ON leaderboard_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard preferences"
  ON leaderboard_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_leaderboard_preferences_enabled
  ON leaderboard_preferences(user_id) WHERE enabled = true;

-- 4. CREATE TRIGGERS
DROP TRIGGER IF EXISTS update_leaderboard_entries_updated_at ON leaderboard_entries;
CREATE TRIGGER update_leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_preferences_updated_at ON leaderboard_preferences;
CREATE TRIGGER update_leaderboard_preferences_updated_at
  BEFORE UPDATE ON leaderboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. CREATE FUNCTIONS
CREATE OR REPLACE FUNCTION get_daily_leaderboard(
  p_game_type TEXT,
  p_puzzle_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY le.score ASC) as rank,
    le.user_id,
    COALESCE(u.username, u.full_name, 'Anonymous') as username,
    u.avatar_url,
    le.score,
    le.metadata,
    le.created_at
  FROM leaderboard_entries le
  JOIN users u ON le.user_id = u.id
  LEFT JOIN leaderboard_preferences lp ON le.user_id = lp.user_id
  WHERE le.game_type = p_game_type
    AND le.leaderboard_type = 'daily_speed'
    AND le.puzzle_date = p_puzzle_date
    AND (lp.enabled IS NULL OR lp.enabled = true)
    AND (lp.show_on_global IS NULL OR lp.show_on_global = true)
  ORDER BY le.score ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_streak_leaderboard(
  p_game_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY le.score DESC) as rank,
    le.user_id,
    COALESCE(u.username, u.full_name, 'Anonymous') as username,
    u.avatar_url,
    le.score,
    le.created_at
  FROM leaderboard_entries le
  JOIN users u ON le.user_id = u.id
  LEFT JOIN leaderboard_preferences lp ON le.user_id = lp.user_id
  WHERE le.game_type = p_game_type
    AND le.leaderboard_type = 'best_streak'
    AND (lp.enabled IS NULL OR lp.enabled = true)
    AND (lp.show_on_global IS NULL OR lp.show_on_global = true)
  ORDER BY le.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_daily_rank(
  p_user_id UUID,
  p_game_type TEXT,
  p_puzzle_date DATE
)
RETURNS TABLE (
  rank BIGINT,
  score INTEGER,
  total_entries BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      le.user_id,
      le.score,
      ROW_NUMBER() OVER (ORDER BY le.score ASC) as rank
    FROM leaderboard_entries le
    LEFT JOIN leaderboard_preferences lp ON le.user_id = lp.user_id
    WHERE le.game_type = p_game_type
      AND le.leaderboard_type = 'daily_speed'
      AND le.puzzle_date = p_puzzle_date
      AND (lp.enabled IS NULL OR lp.enabled = true)
      AND (lp.show_on_global IS NULL OR lp.show_on_global = true)
  )
  SELECT
    re.rank,
    re.score,
    (SELECT COUNT(*) FROM ranked_entries) as total_entries
  FROM ranked_entries re
  WHERE re.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_last_submission TIMESTAMPTZ;
BEGIN
  -- Security validations
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot submit scores for other users';
  END IF;

  IF p_score <= 0 OR p_score > 7200 THEN
    RAISE EXCEPTION 'Invalid score: Must be between 1 and 7200 seconds';
  END IF;

  IF EXISTS (
    SELECT 1 FROM leaderboard_preferences
    WHERE user_id = p_user_id AND enabled = false
  ) THEN
    RAISE EXCEPTION 'Leaderboards disabled for this user';
  END IF;

  -- Rate limiting
  SELECT created_at INTO v_last_submission
  FROM leaderboard_entries
  WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND leaderboard_type = p_leaderboard_type
    AND puzzle_date = p_puzzle_date
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_submission IS NOT NULL
     AND (NOW() - v_last_submission) < INTERVAL '5 seconds' THEN
    RAISE EXCEPTION 'Rate limit: Wait 5 seconds between submissions';
  END IF;

  -- Check for existing entry
  SELECT id, score INTO v_entry_id, v_existing_score
  FROM leaderboard_entries
  WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND leaderboard_type = p_leaderboard_type
    AND puzzle_date = p_puzzle_date;

  -- Insert or update
  IF v_entry_id IS NULL THEN
    INSERT INTO leaderboard_entries (
      user_id, game_type, leaderboard_type, puzzle_date, score, metadata
    )
    VALUES (
      p_user_id, p_game_type, p_leaderboard_type, p_puzzle_date, p_score, p_metadata
    )
    RETURNING id INTO v_entry_id;
  ELSE
    IF (p_leaderboard_type = 'daily_speed' AND p_score < v_existing_score) OR
       (p_leaderboard_type = 'best_streak' AND p_score > v_existing_score) THEN
      UPDATE leaderboard_entries
      SET score = p_score, metadata = p_metadata, updated_at = NOW()
      WHERE id = v_entry_id;
    ELSE
      NULL;
    END IF;
  END IF;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. GRANT PERMISSIONS
GRANT SELECT ON leaderboard_entries TO anon, authenticated;
GRANT INSERT, UPDATE ON leaderboard_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON leaderboard_preferences TO authenticated;

GRANT EXECUTE ON FUNCTION get_daily_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_streak_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_rank TO authenticated;
GRANT EXECUTE ON FUNCTION submit_leaderboard_score TO authenticated;

-- 7. CREATE DEFAULT PREFERENCES FOR EXISTING USERS
INSERT INTO leaderboard_preferences (user_id, enabled, show_on_global)
SELECT id, true, true FROM users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- You can now test the leaderboard submission by:
-- 1. Signing in to your app
-- 2. Completing a daily puzzle
-- 3. Checking the leaderboard modal
-- =====================================================
