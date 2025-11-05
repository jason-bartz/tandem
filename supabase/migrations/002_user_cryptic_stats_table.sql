-- Create user_cryptic_stats table for syncing Daily Cryptic stats across devices
-- This allows authenticated users to have their cryptic game stats stored in the database
-- and synced across all their devices/browsers

CREATE TABLE IF NOT EXISTS user_cryptic_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_hints_used INTEGER NOT NULL DEFAULT 0,
  perfect_solves INTEGER NOT NULL DEFAULT 0,
  average_time INTEGER NOT NULL DEFAULT 0,
  completed_puzzles JSONB DEFAULT '{}'::jsonb,
  last_played_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_cryptic_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own stats
CREATE POLICY "Users can read own cryptic stats"
  ON user_cryptic_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own stats
CREATE POLICY "Users can insert own cryptic stats"
  ON user_cryptic_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own stats
CREATE POLICY "Users can update own cryptic stats"
  ON user_cryptic_stats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_cryptic_stats_user_id ON user_cryptic_stats(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_cryptic_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before each update
CREATE TRIGGER set_user_cryptic_stats_updated_at
  BEFORE UPDATE ON user_cryptic_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cryptic_stats_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_cryptic_stats IS 'Stores user-specific Daily Cryptic game statistics for cross-device sync';
COMMENT ON COLUMN user_cryptic_stats.user_id IS 'References the authenticated user';
COMMENT ON COLUMN user_cryptic_stats.total_completed IS 'Total cryptic puzzles completed (first attempts only)';
COMMENT ON COLUMN user_cryptic_stats.current_streak IS 'Current consecutive daily completions';
COMMENT ON COLUMN user_cryptic_stats.longest_streak IS 'Best streak ever achieved';
COMMENT ON COLUMN user_cryptic_stats.total_hints_used IS 'Total hints used across all puzzles';
COMMENT ON COLUMN user_cryptic_stats.perfect_solves IS 'Puzzles completed without using any hints';
COMMENT ON COLUMN user_cryptic_stats.average_time IS 'Average completion time in seconds';
COMMENT ON COLUMN user_cryptic_stats.completed_puzzles IS 'JSON object mapping dates to completion data';
COMMENT ON COLUMN user_cryptic_stats.last_played_date IS 'Date of last puzzle played (YYYY-MM-DD)';
