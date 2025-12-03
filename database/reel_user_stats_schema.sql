-- =====================================================
-- REEL CONNECTIONS USER STATS SCHEMA
-- Run this in Supabase SQL Editor to create the table
-- =====================================================

-- =====================================================
-- TABLE: reel_user_stats
-- Aggregate stats per user for Reel Connections game
-- =====================================================

CREATE TABLE IF NOT EXISTS reel_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_time_ms BIGINT DEFAULT 0, -- milliseconds
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_played_date DATE,
  game_history JSONB DEFAULT '[]', -- Array of {date, won, timeMs, mistakes}
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_reel_user_stats_user ON reel_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_user_stats_streak ON reel_user_stats(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_reel_user_stats_best_streak ON reel_user_stats(best_streak DESC);

-- Add comments
COMMENT ON TABLE reel_user_stats IS 'Aggregate Reel Connections stats per user';
COMMENT ON COLUMN reel_user_stats.current_streak IS 'Current consecutive days streak (daily puzzles only)';
COMMENT ON COLUMN reel_user_stats.best_streak IS 'Best streak ever achieved';
COMMENT ON COLUMN reel_user_stats.game_history IS 'JSONB array of recent game data';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE reel_user_stats ENABLE ROW LEVEL SECURITY;

-- Users can only view their own stats
CREATE POLICY "reel_user_stats_select_policy"
ON reel_user_stats FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own stats
CREATE POLICY "reel_user_stats_insert_policy"
ON reel_user_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "reel_user_stats_update_policy"
ON reel_user_stats FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_reel_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reel_user_stats_updated_at_trigger ON reel_user_stats;
CREATE TRIGGER reel_user_stats_updated_at_trigger
BEFORE UPDATE ON reel_user_stats
FOR EACH ROW
EXECUTE FUNCTION update_reel_user_stats_updated_at();
