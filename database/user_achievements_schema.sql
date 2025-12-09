-- =====================================================
-- USER ACHIEVEMENTS SCHEMA
-- Stores unlocked achievements per user for cross-device sync
-- Run this in Supabase SQL Editor to create the table
-- =====================================================

-- =====================================================
-- TABLE: user_achievements
-- Tracks which achievements each user has unlocked
-- =====================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure each user can only unlock each achievement once
  UNIQUE(user_id, achievement_id)
);

-- Add comments for documentation
COMMENT ON TABLE user_achievements IS 'Tracks unlocked achievements per user for cross-device sync';
COMMENT ON COLUMN user_achievements.user_id IS 'Reference to the authenticated user';
COMMENT ON COLUMN user_achievements.achievement_id IS 'Unique achievement identifier (e.g., com.tandemdaily.app.first_pedal)';
COMMENT ON COLUMN user_achievements.unlocked_at IS 'Timestamp when the achievement was first unlocked';

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup by user (most common query)
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements(user_id);

-- Lookup by achievement for analytics
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement
  ON user_achievements(achievement_id);

-- For recent achievements queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked
  ON user_achievements(unlocked_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can only view their own achievements
DROP POLICY IF EXISTS "user_achievements_select_policy" ON user_achievements;
CREATE POLICY "user_achievements_select_policy"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own achievements
DROP POLICY IF EXISTS "user_achievements_insert_policy" ON user_achievements;
CREATE POLICY "user_achievements_insert_policy"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own achievements (for reset functionality)
DROP POLICY IF EXISTS "user_achievements_delete_policy" ON user_achievements;
CREATE POLICY "user_achievements_delete_policy"
  ON user_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, DELETE ON user_achievements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_achievements_id_seq TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (run after creation)
-- =====================================================

-- Check table was created:
-- SELECT * FROM user_achievements LIMIT 5;

-- Check indexes exist:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'user_achievements';

-- Check RLS policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'user_achievements';

-- Example insert (replace with actual user_id):
-- INSERT INTO user_achievements (user_id, achievement_id)
-- VALUES ('your-user-uuid', 'com.tandemdaily.app.first_pedal')
-- ON CONFLICT (user_id, achievement_id) DO NOTHING;
