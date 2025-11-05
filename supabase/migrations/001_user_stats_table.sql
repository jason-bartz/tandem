-- Create user_stats table for syncing stats across devices
-- This allows authenticated users to have their game stats stored in the database
-- and synced across all their devices/browsers

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own stats
CREATE POLICY "Users can read own stats"
  ON user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own stats
CREATE POLICY "Users can insert own stats"
  ON user_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own stats
CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before each update
CREATE TRIGGER set_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_updated_at();

-- Add comment for documentation
COMMENT ON TABLE user_stats IS 'Stores user-specific game statistics for cross-device sync';
COMMENT ON COLUMN user_stats.user_id IS 'References the authenticated user';
COMMENT ON COLUMN user_stats.played IS 'Total games played (first attempts only)';
COMMENT ON COLUMN user_stats.wins IS 'Total games won (first attempts only)';
COMMENT ON COLUMN user_stats.current_streak IS 'Current consecutive daily wins';
COMMENT ON COLUMN user_stats.best_streak IS 'Best streak ever achieved';
COMMENT ON COLUMN user_stats.last_streak_date IS 'Date of last streak update (YYYY-MM-DD)';
