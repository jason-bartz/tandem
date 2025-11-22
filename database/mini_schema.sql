-- Daily Mini Crossword - Database Schema
-- Execute this SQL in Supabase SQL Editor or via migration

-- =====================================================
-- TABLE: mini_puzzles
-- Stores all Daily Mini crossword puzzles
-- =====================================================

CREATE TABLE IF NOT EXISTS mini_puzzles (
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
CREATE INDEX IF NOT EXISTS idx_mini_puzzles_date ON mini_puzzles(date);
CREATE INDEX IF NOT EXISTS idx_mini_puzzles_number ON mini_puzzles(number);

-- Add comments for documentation
COMMENT ON TABLE mini_puzzles IS 'Daily Mini crossword puzzles (5x5 grid)';
COMMENT ON COLUMN mini_puzzles.grid IS '5x5 array with letters and black squares (■)';
COMMENT ON COLUMN mini_puzzles.clues IS 'JSON: {across: [{number, clue, answer}], down: [...]}';
COMMENT ON COLUMN mini_puzzles.solution IS '5x5 array with complete solution';

-- =====================================================
-- TABLE: mini_stats
-- Individual puzzle completion records per user
-- =====================================================

CREATE TABLE IF NOT EXISTS mini_stats (
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
CREATE INDEX IF NOT EXISTS idx_mini_stats_user ON mini_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_mini_stats_date ON mini_stats(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_mini_stats_user_date ON mini_stats(user_id, puzzle_date);

-- Add comments
COMMENT ON TABLE mini_stats IS 'Individual Mini puzzle completion records';
COMMENT ON COLUMN mini_stats.perfect_solve IS 'TRUE if solved without checks, reveals, or mistakes';

-- =====================================================
-- TABLE: mini_user_stats
-- Aggregate stats per user (calculated from mini_stats)
-- =====================================================

CREATE TABLE IF NOT EXISTS mini_user_stats (
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
CREATE INDEX IF NOT EXISTS idx_mini_user_stats_user ON mini_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_mini_user_stats_streak ON mini_user_stats(current_streak DESC);

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

-- Puzzles: Only admins can insert/update/delete
-- Note: You'll need to set up an admin role or check user permissions
-- For now, we'll allow authenticated users with specific check
-- CREATE POLICY "mini_puzzles_admin_policy"
-- ON mini_puzzles FOR ALL
-- USING (auth.uid() IN (SELECT user_id FROM admin_users));

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
-- OPTIONAL: Triggers for automatic timestamp updates
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
-- SAMPLE DATA STRUCTURE (for reference, not executed)
-- =====================================================

/*

-- Example puzzle structure:
{
  "date": "2025-11-17",
  "number": 1,
  "grid": [
    ["C","A","T","S","■"],
    ["A","R","E","A","■"],
    ["R","E","A","D","■"],
    ["E","A","R","S","■"],
    ["■","■","■","■","■"]
  ],
  "clues": {
    "across": [
      {"number": 1, "clue": "Feline pets", "answer": "CATS"},
      {"number": 5, "clue": "Region", "answer": "AREA"},
      {"number": 6, "clue": "Peruse a book", "answer": "READ"},
      {"number": 7, "clue": "Hearing organs", "answer": "EARS"}
    ],
    "down": [
      {"number": 1, "clue": "Automobile", "answer": "CARE"},
      {"number": 2, "clue": "Each and every", "answer": "ATE"},
      {"number": 3, "clue": "Consumed food", "answer": "TARS"},
      {"number": 4, "clue": "Melancholy", "answer": "SAD"}
    ]
  },
  "solution": [
    ["C","A","T","S","■"],
    ["A","R","E","A","■"],
    ["R","E","A","D","■"],
    ["E","A","R","S","■"],
    ["■","■","■","■","■"]
  ]
}

*/

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after creating the schema to verify
-- =====================================================

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'mini_%';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'mini_%';

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'mini_%';

-- =====================================================
-- NOTES FOR DEPLOYMENT
-- =====================================================

/*

1. Execute this SQL in Supabase SQL Editor
2. Verify all tables created successfully
3. Verify RLS policies are active
4. Insert sample puzzles (see sample_puzzles.sql)
5. Test API endpoints with sample data
6. Test RLS by querying as authenticated user

IMPORTANT:
- Black squares in grid are represented as "■" character
- All JSON fields use JSONB for better performance
- Indexes are created for common query patterns
- RLS ensures users only see their own stats
- Triggers auto-update timestamps

*/
