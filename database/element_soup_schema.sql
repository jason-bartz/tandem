-- Element Soup Database Schema
-- Version: 1.0
-- Created: 2026-01-23
--
-- This schema supports the Element Soup game, an Infinite Craft-inspired
-- daily puzzle game where players combine elements to reach a target.

-- ============================================
-- 1. CORE ELEMENT COMBINATIONS TABLE
-- ============================================
-- This is the heart of the game - stores all discovered element combinations.
-- Uses bidirectional key structure for consistent lookups.

CREATE TABLE element_combinations (
  id SERIAL PRIMARY KEY,

  -- Normalized key for bidirectional lookup (alphabetically sorted, lowercase)
  -- e.g., "fire|water" not "water|fire"
  combination_key VARCHAR(255) NOT NULL UNIQUE,

  -- Individual elements (denormalized for query performance)
  element_a VARCHAR(100) NOT NULL,
  element_b VARCHAR(100) NOT NULL,

  -- Result
  result_element VARCHAR(100) NOT NULL,
  result_emoji VARCHAR(30) DEFAULT '✨',  -- Supports 1-3 emojis

  -- Discovery metadata
  discovered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discovery_count INTEGER DEFAULT 1,

  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT TRUE,
  ai_model VARCHAR(100),
  ai_prompt_tokens INTEGER,
  ai_response_tokens INTEGER,

  -- Usage tracking
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Critical indexes for fast lookups
CREATE INDEX idx_element_combinations_key ON element_combinations(combination_key);
CREATE INDEX idx_element_combinations_result ON element_combinations(result_element);
CREATE INDEX idx_element_combinations_discovered_by ON element_combinations(discovered_by);
CREATE INDEX idx_element_combinations_created_at ON element_combinations(created_at DESC);

-- Function to normalize combination key (alphabetically sorted, lowercase)
CREATE OR REPLACE FUNCTION normalize_combination_key(a TEXT, b TEXT)
RETURNS TEXT AS $$
BEGIN
  IF LOWER(TRIM(a)) <= LOWER(TRIM(b)) THEN
    RETURN LOWER(TRIM(a)) || '|' || LOWER(TRIM(b));
  ELSE
    RETURN LOWER(TRIM(b)) || '|' || LOWER(TRIM(a));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_element_combinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_element_combinations_updated_at
  BEFORE UPDATE ON element_combinations
  FOR EACH ROW
  EXECUTE FUNCTION update_element_combinations_updated_at();


-- ============================================
-- 2. DAILY PUZZLES TABLE
-- ============================================

CREATE TABLE element_soup_puzzles (
  id SERIAL PRIMARY KEY,
  puzzle_number INTEGER NOT NULL UNIQUE,
  date DATE NOT NULL UNIQUE,

  -- Target element
  target_element VARCHAR(100) NOT NULL,
  target_emoji VARCHAR(30) DEFAULT '✨',  -- Supports 1-3 emojis

  -- Par value (benchmark number of moves)
  par_moves INTEGER NOT NULL,

  -- Solution path (for admin reference)
  -- Format: [{ step: 1, elementA: "Water", elementB: "Fire", result: "Steam" }, ...]
  solution_path JSONB NOT NULL DEFAULT '[]',

  -- Difficulty hint (optional, for future use)
  difficulty VARCHAR(20) DEFAULT 'normal',

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_soup_puzzles_date ON element_soup_puzzles(date DESC);
CREATE INDEX idx_soup_puzzles_number ON element_soup_puzzles(puzzle_number DESC);
CREATE INDEX idx_soup_puzzles_published ON element_soup_puzzles(published, date);

-- Trigger for updated_at
CREATE TRIGGER trigger_soup_puzzles_updated_at
  BEFORE UPDATE ON element_soup_puzzles
  FOR EACH ROW
  EXECUTE FUNCTION update_element_combinations_updated_at();


-- ============================================
-- 3. PER-GAME USER STATS TABLE
-- ============================================

CREATE TABLE element_soup_game_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_date DATE NOT NULL,
  puzzle_number INTEGER NOT NULL,

  -- Performance metrics
  completed BOOLEAN DEFAULT FALSE,
  time_taken INTEGER,  -- seconds
  moves_count INTEGER,
  par_moves INTEGER,

  -- Discovery tracking for this game
  elements_discovered INTEGER DEFAULT 0,
  new_discoveries INTEGER DEFAULT 0,
  first_discoveries INTEGER DEFAULT 0,

  -- Element bank at completion (for replay/analysis)
  final_element_bank JSONB DEFAULT '[]',

  -- Combination path taken
  combination_path JSONB DEFAULT '[]',

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, puzzle_date)
);

CREATE INDEX idx_soup_game_stats_user ON element_soup_game_stats(user_id);
CREATE INDEX idx_soup_game_stats_date ON element_soup_game_stats(puzzle_date DESC);
CREATE INDEX idx_soup_game_stats_user_date ON element_soup_game_stats(user_id, puzzle_date);
CREATE INDEX idx_soup_game_stats_completed ON element_soup_game_stats(completed, puzzle_date);


-- ============================================
-- 4. AGGREGATE USER STATS TABLE
-- ============================================

CREATE TABLE element_soup_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Completion stats
  total_completed INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  best_time INTEGER,  -- seconds
  average_time INTEGER,

  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_date DATE,

  -- Discovery stats
  total_discoveries INTEGER DEFAULT 0,
  first_discoveries INTEGER DEFAULT 0,

  -- Par performance
  under_par_count INTEGER DEFAULT 0,
  at_par_count INTEGER DEFAULT 0,
  over_par_count INTEGER DEFAULT 0,

  -- Game history (recent completions)
  game_history JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_soup_user_stats_streak ON element_soup_user_stats(current_streak DESC);
CREATE INDEX idx_soup_user_stats_longest ON element_soup_user_stats(longest_streak DESC);
CREATE INDEX idx_soup_user_stats_completed ON element_soup_user_stats(total_completed DESC);

-- Trigger for updated_at
CREATE TRIGGER trigger_soup_user_stats_updated_at
  BEFORE UPDATE ON element_soup_user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_element_combinations_updated_at();


-- ============================================
-- 5. FIRST DISCOVERIES LOG TABLE
-- ============================================

CREATE TABLE element_soup_first_discoveries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username VARCHAR(100),

  -- The combination that was discovered
  combination_id INTEGER REFERENCES element_combinations(id) ON DELETE SET NULL,
  element_a VARCHAR(100) NOT NULL,
  element_b VARCHAR(100) NOT NULL,
  result_element VARCHAR(100) NOT NULL,
  result_emoji VARCHAR(30),

  -- Context
  puzzle_date DATE,
  puzzle_number INTEGER,

  -- Timestamp
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_first_discoveries_user ON element_soup_first_discoveries(user_id);
CREATE INDEX idx_first_discoveries_date ON element_soup_first_discoveries(discovered_at DESC);
CREATE INDEX idx_first_discoveries_element ON element_soup_first_discoveries(result_element);


-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE element_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_soup_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_soup_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_soup_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_soup_first_discoveries ENABLE ROW LEVEL SECURITY;

-- Element Combinations: Public read, authenticated insert
CREATE POLICY "element_combinations_public_read" ON element_combinations
  FOR SELECT USING (true);

CREATE POLICY "element_combinations_auth_insert" ON element_combinations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR discovered_by IS NULL);

-- Puzzles: Public read for published, all for admins
CREATE POLICY "soup_puzzles_public_read" ON element_soup_puzzles
  FOR SELECT USING (published = true);

-- Game Stats: Users can only see/modify their own
CREATE POLICY "soup_game_stats_user_select" ON element_soup_game_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "soup_game_stats_user_insert" ON element_soup_game_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "soup_game_stats_user_update" ON element_soup_game_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- User Stats: Users can only see/modify their own
CREATE POLICY "soup_user_stats_user_select" ON element_soup_user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "soup_user_stats_user_insert" ON element_soup_user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "soup_user_stats_user_update" ON element_soup_user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- First Discoveries: Public read
CREATE POLICY "first_discoveries_public_read" ON element_soup_first_discoveries
  FOR SELECT USING (true);

CREATE POLICY "first_discoveries_auth_insert" ON element_soup_first_discoveries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);


-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to update aggregate stats after game completion
CREATE OR REPLACE FUNCTION update_soup_aggregate_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_completed INTEGER;
  v_total_moves INTEGER;
  v_best_time INTEGER;
  v_avg_time INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_played DATE;
  v_total_discoveries INTEGER;
  v_first_discoveries INTEGER;
  v_under_par INTEGER;
  v_at_par INTEGER;
  v_over_par INTEGER;
BEGIN
  -- Calculate aggregate stats from game_stats
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    SUM(moves_count) FILTER (WHERE completed = true),
    MIN(time_taken) FILTER (WHERE completed = true),
    AVG(time_taken) FILTER (WHERE completed = true)::INTEGER,
    SUM(elements_discovered),
    SUM(first_discoveries),
    COUNT(*) FILTER (WHERE completed = true AND moves_count < par_moves),
    COUNT(*) FILTER (WHERE completed = true AND moves_count = par_moves),
    COUNT(*) FILTER (WHERE completed = true AND moves_count > par_moves)
  INTO
    v_total_completed,
    v_total_moves,
    v_best_time,
    v_avg_time,
    v_total_discoveries,
    v_first_discoveries,
    v_under_par,
    v_at_par,
    v_over_par
  FROM element_soup_game_stats
  WHERE user_id = p_user_id;

  -- Calculate streaks
  WITH consecutive_days AS (
    SELECT
      puzzle_date,
      puzzle_date - (ROW_NUMBER() OVER (ORDER BY puzzle_date))::INTEGER AS grp
    FROM element_soup_game_stats
    WHERE user_id = p_user_id AND completed = true
    ORDER BY puzzle_date
  ),
  streak_groups AS (
    SELECT
      grp,
      COUNT(*) AS streak_length,
      MAX(puzzle_date) AS last_date
    FROM consecutive_days
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(streak_length), 0),
    COALESCE((SELECT streak_length FROM streak_groups ORDER BY last_date DESC LIMIT 1), 0),
    (SELECT MAX(puzzle_date) FROM element_soup_game_stats WHERE user_id = p_user_id AND completed = true)
  INTO v_longest_streak, v_current_streak, v_last_played
  FROM streak_groups;

  -- Check if current streak is actually current (played yesterday or today)
  IF v_last_played IS NOT NULL AND v_last_played < CURRENT_DATE - 1 THEN
    v_current_streak := 0;
  END IF;

  -- Upsert aggregate stats
  INSERT INTO element_soup_user_stats (
    user_id,
    total_completed,
    total_moves,
    best_time,
    average_time,
    current_streak,
    longest_streak,
    last_played_date,
    total_discoveries,
    first_discoveries,
    under_par_count,
    at_par_count,
    over_par_count
  ) VALUES (
    p_user_id,
    COALESCE(v_total_completed, 0),
    COALESCE(v_total_moves, 0),
    v_best_time,
    v_avg_time,
    COALESCE(v_current_streak, 0),
    COALESCE(v_longest_streak, 0),
    v_last_played,
    COALESCE(v_total_discoveries, 0),
    COALESCE(v_first_discoveries, 0),
    COALESCE(v_under_par, 0),
    COALESCE(v_at_par, 0),
    COALESCE(v_over_par, 0)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_completed = EXCLUDED.total_completed,
    total_moves = EXCLUDED.total_moves,
    best_time = EXCLUDED.best_time,
    average_time = EXCLUDED.average_time,
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_played_date = EXCLUDED.last_played_date,
    total_discoveries = EXCLUDED.total_discoveries,
    first_discoveries = EXCLUDED.first_discoveries,
    under_par_count = EXCLUDED.under_par_count,
    at_par_count = EXCLUDED.at_par_count,
    over_par_count = EXCLUDED.over_par_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 8. SEED STARTER ELEMENT COMBINATIONS
-- ============================================

-- Insert the classic starter combinations that should always exist
INSERT INTO element_combinations (combination_key, element_a, element_b, result_element, result_emoji, ai_generated, discovered_by)
VALUES
  -- Basic combinations from the 4 starter elements
  ('earth|fire', 'Earth', 'Fire', 'Lava', '🌋', false, NULL),
  ('earth|water', 'Earth', 'Water', 'Mud', '💩', false, NULL),
  ('earth|wind', 'Earth', 'Wind', 'Dust', '💨', false, NULL),
  ('fire|water', 'Fire', 'Water', 'Steam', '♨️', false, NULL),
  ('fire|wind', 'Fire', 'Wind', 'Smoke', '💨', false, NULL),
  ('water|wind', 'Water', 'Wind', 'Wave', '🌊', false, NULL),
  -- Self-combinations
  ('earth|earth', 'Earth', 'Earth', 'Mountain', '⛰️', false, NULL),
  ('fire|fire', 'Fire', 'Fire', 'Inferno', '🔥', false, NULL),
  ('water|water', 'Water', 'Water', 'Lake', '🏞️', false, NULL),
  ('wind|wind', 'Wind', 'Wind', 'Tornado', '🌪️', false, NULL)
ON CONFLICT (combination_key) DO NOTHING;


-- ============================================
-- NOTES FOR DEPLOYMENT
-- ============================================
--
-- 1. Run this schema in Supabase SQL Editor
-- 2. The RLS policies assume standard Supabase auth
-- 3. The seed combinations provide a consistent starting experience
-- 4. Service role key bypasses RLS for admin operations
-- 5. Consider adding admin-specific policies later for puzzle management
