-- =============================================================
-- Tandem Puzzles Schema
-- Daily Tandem emoji puzzle storage
-- Matches pattern from mini_schema.sql for consistency
-- =============================================================

-- Drop existing objects if needed (for development only)
-- DROP TABLE IF EXISTS tandem_puzzles CASCADE;

-- =============================================================
-- TABLE: tandem_puzzles
-- =============================================================

CREATE TABLE IF NOT EXISTS tandem_puzzles (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    number INTEGER NOT NULL,
    theme VARCHAR(100) NOT NULL,
    clues JSONB NOT NULL,
    difficulty_rating VARCHAR(20),
    difficulty_factors JSONB,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE tandem_puzzles IS 'Daily Tandem emoji puzzles - one puzzle per date';
COMMENT ON COLUMN tandem_puzzles.date IS 'Puzzle date in YYYY-MM-DD format';
COMMENT ON COLUMN tandem_puzzles.number IS 'Sequential puzzle number starting from launch date (2025-08-15)';
COMMENT ON COLUMN tandem_puzzles.theme IS 'The theme connecting all 4 clues';
COMMENT ON COLUMN tandem_puzzles.clues IS 'Array of 4 clue objects: [{emoji, answer, hint}, ...]';
COMMENT ON COLUMN tandem_puzzles.difficulty_rating IS 'Difficulty level: Easy, Medium-Easy, Medium, Medium-Hard, Hard';
COMMENT ON COLUMN tandem_puzzles.difficulty_factors IS 'Detailed difficulty breakdown: {themeComplexity, vocabularyLevel, emojiClarity, hintDirectness}';
COMMENT ON COLUMN tandem_puzzles.created_by IS 'Admin username who created/edited the puzzle';

-- =============================================================
-- INDEXES
-- =============================================================

-- Primary lookup by date (most common query)
CREATE INDEX IF NOT EXISTS idx_tandem_puzzles_date
    ON tandem_puzzles(date DESC);

-- Lookup by puzzle number
CREATE INDEX IF NOT EXISTS idx_tandem_puzzles_number
    ON tandem_puzzles(number);

-- For admin queries sorting by creation time
CREATE INDEX IF NOT EXISTS idx_tandem_puzzles_created_at
    ON tandem_puzzles(created_at DESC);

-- =============================================================
-- AUTO-UPDATE TRIGGER
-- =============================================================

CREATE OR REPLACE FUNCTION update_tandem_puzzles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tandem_puzzles_updated_at_trigger ON tandem_puzzles;

CREATE TRIGGER tandem_puzzles_updated_at_trigger
    BEFORE UPDATE ON tandem_puzzles
    FOR EACH ROW
    EXECUTE FUNCTION update_tandem_puzzles_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE tandem_puzzles ENABLE ROW LEVEL SECURITY;

-- Public read access (puzzles are public content)
DROP POLICY IF EXISTS "tandem_puzzles_public_select" ON tandem_puzzles;
CREATE POLICY "tandem_puzzles_public_select"
    ON tandem_puzzles FOR SELECT
    USING (true);

-- Service role full access (for admin operations via API)
DROP POLICY IF EXISTS "tandem_puzzles_service_role_all" ON tandem_puzzles;
CREATE POLICY "tandem_puzzles_service_role_all"
    ON tandem_puzzles FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================
-- GRANTS
-- =============================================================

GRANT SELECT ON tandem_puzzles TO anon;
GRANT SELECT ON tandem_puzzles TO authenticated;
GRANT ALL ON tandem_puzzles TO service_role;
GRANT USAGE, SELECT ON SEQUENCE tandem_puzzles_id_seq TO service_role;

-- =============================================================
-- JSONB CLUES STRUCTURE EXAMPLE
-- =============================================================
/*
The clues column stores an array of 4 puzzle clues:

[
    {
        "emoji": "☀️🌡️",
        "answer": "SUNNY",
        "hint": "Bright day condition"
    },
    {
        "emoji": "☁️💧",
        "answer": "RAIN",
        "hint": "Water from clouds"
    },
    {
        "emoji": "❄️🌨️",
        "answer": "SNOW",
        "hint": "Winter precipitation"
    },
    {
        "emoji": "⚡🔊",
        "answer": "THUNDER",
        "hint": "Storm sound"
    }
]

All answers should be uppercase.
Hints are optional but recommended (max 60 characters).
*/

-- =============================================================
-- VERIFICATION QUERIES
-- =============================================================

-- Check table was created
-- SELECT * FROM tandem_puzzles LIMIT 5;

-- Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'tandem_puzzles';

-- Check RLS policies
-- SELECT policyname FROM pg_policies WHERE tablename = 'tandem_puzzles';
