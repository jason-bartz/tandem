-- Daily Mini Crossword - Clean Database Schema
-- Execute this SQL in Supabase SQL Editor
-- This version drops existing tables first to avoid conflicts

-- =====================================================
-- DROP EXISTING TABLES (if they exist)
-- =====================================================

DROP TABLE IF EXISTS mini_stats CASCADE;
DROP TABLE IF EXISTS mini_user_stats CASCADE;
DROP TABLE IF EXISTS mini_puzzles CASCADE;

-- =====================================================
-- TABLE: mini_puzzles
-- Stores all Daily Mini crossword puzzles
-- =====================================================

CREATE TABLE mini_puzzles (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  number INTEGER NOT NULL,
  grid JSONB NOT NULL, -- 5x5 array (includes black squares marked as "■")
  clues JSONB NOT NULL, -- {across: [...], down: [...]}
  solution JSONB NOT NULL, -- Same as grid but complete solution
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard' (optional)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast date lookups
CREATE INDEX idx_mini_puzzles_date ON mini_puzzles(date);
CREATE INDEX idx_mini_puzzles_number ON mini_puzzles(number);

-- Add comments for documentation
COMMENT ON TABLE mini_puzzles IS 'Daily Mini crossword puzzles (5x5 grid)';
COMMENT ON COLUMN mini_puzzles.grid IS '5x5 array with letters and black squares (■)';
COMMENT ON COLUMN mini_puzzles.clues IS 'JSON: {across: [{number, clue, answer}], down: [...]}';
COMMENT ON COLUMN mini_puzzles.solution IS '5x5 array with complete solution';

-- =====================================================
-- TABLE: mini_stats
-- Individual puzzle completion records per user
-- =====================================================

CREATE TABLE mini_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_date DATE NOT NULL,
  time_taken INTEGER NOT NULL, -- seconds
  checks_used INTEGER DEFAULT 0,
  reveals_used INTEGER DEFAULT 0,
  mistakes INTEGER DEFAULT 0,
  perfect_solve BOOLEAN DEFAULT FALSE, -- No checks/reveals/mistakes
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, puzzle_date)
);

-- Indexes for fast queries
CREATE INDEX idx_mini_stats_user ON mini_stats(user_id);
CREATE INDEX idx_mini_stats_date ON mini_stats(puzzle_date);
CREATE INDEX idx_mini_stats_user_date ON mini_stats(user_id, puzzle_date);

-- Add comments
COMMENT ON TABLE mini_stats IS 'Individual Mini puzzle completion records';
COMMENT ON COLUMN mini_stats.perfect_solve IS 'TRUE if solved without checks, reveals, or mistakes';

-- =====================================================
-- TABLE: mini_user_stats
-- Aggregate stats per user (calculated from mini_stats)
-- =====================================================

CREATE TABLE mini_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  average_time INTEGER DEFAULT 0, -- seconds
  best_time INTEGER DEFAULT 0, -- seconds (fastest solve)
  perfect_solves INTEGER DEFAULT 0,
  total_checks INTEGER DEFAULT 0,
  total_reveals INTEGER DEFAULT 0,
  completed_puzzles JSONB DEFAULT '{}', -- {"YYYY-MM-DD": {timeTaken, checks, ...}}
  last_played_date DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_mini_user_stats_user ON mini_user_stats(user_id);
CREATE INDEX idx_mini_user_stats_streak ON mini_user_stats(current_streak DESC);

-- Add comments
COMMENT ON TABLE mini_user_stats IS 'Aggregate Mini stats per user';
COMMENT ON COLUMN mini_user_stats.current_streak IS 'Current consecutive days streak (daily puzzles only)';
COMMENT ON COLUMN mini_user_stats.completed_puzzles IS 'JSONB map of date to puzzle data';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE mini_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_user_stats ENABLE ROW LEVEL SECURITY;

-- Puzzles: Public read access (everyone can see puzzles)
CREATE POLICY "mini_puzzles_select_policy"
ON mini_puzzles FOR SELECT
USING (true);

-- Stats: Users can only view their own stats
CREATE POLICY "mini_stats_select_policy"
ON mini_stats FOR SELECT
USING (auth.uid() = user_id);

-- Stats: Users can insert their own stats
CREATE POLICY "mini_stats_insert_policy"
ON mini_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Stats: Users can update their own stats
CREATE POLICY "mini_stats_update_policy"
ON mini_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Stats: Users can delete their own stats
CREATE POLICY "mini_stats_delete_policy"
ON mini_stats FOR DELETE
USING (auth.uid() = user_id);

-- Aggregate Stats: Users can only view their own aggregate stats
CREATE POLICY "mini_user_stats_select_policy"
ON mini_user_stats FOR SELECT
USING (auth.uid() = user_id);

-- Aggregate Stats: Users can insert their own aggregate stats
CREATE POLICY "mini_user_stats_insert_policy"
ON mini_user_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Aggregate Stats: Users can update their own aggregate stats
CREATE POLICY "mini_user_stats_update_policy"
ON mini_user_stats FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS for automatic timestamp updates
-- =====================================================

-- Update mini_puzzles.updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_mini_puzzles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mini_puzzles_updated_at_trigger
BEFORE UPDATE ON mini_puzzles
FOR EACH ROW
EXECUTE FUNCTION update_mini_puzzles_updated_at();

-- Update mini_user_stats.updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_mini_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mini_user_stats_updated_at_trigger
BEFORE UPDATE ON mini_user_stats
FOR EACH ROW
EXECUTE FUNCTION update_mini_user_stats_updated_at();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'mini_%';

-- Check columns in mini_puzzles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mini_puzzles'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Daily Mini schema created successfully!';
  RAISE NOTICE 'Next step: Run sample_puzzles.sql to add test data';
END $$;
