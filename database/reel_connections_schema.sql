-- Reel Connections Puzzles Schema
-- Run this SQL in your Supabase SQL editor or database client

-- Main puzzles table
CREATE TABLE IF NOT EXISTS reel_connections_puzzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table (4 groups per puzzle)
CREATE TABLE IF NOT EXISTS reel_connections_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  puzzle_id UUID NOT NULL REFERENCES reel_connections_puzzles(id) ON DELETE CASCADE,
  connection TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easiest', 'easy', 'medium', 'hardest')),
  "order" INTEGER NOT NULL CHECK ("order" BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(puzzle_id, "order")
);

-- Movies table (4 movies per group)
CREATE TABLE IF NOT EXISTS reel_connections_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES reel_connections_groups(id) ON DELETE CASCADE,
  imdb_id TEXT NOT NULL,
  title TEXT NOT NULL,
  year TEXT NOT NULL,
  poster TEXT NOT NULL,
  "order" INTEGER NOT NULL CHECK ("order" BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, "order")
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reel_puzzles_date ON reel_connections_puzzles(date DESC);
CREATE INDEX IF NOT EXISTS idx_reel_groups_puzzle ON reel_connections_groups(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_reel_movies_group ON reel_connections_movies(group_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_reel_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_reel_connections_puzzles_updated_at ON reel_connections_puzzles;
CREATE TRIGGER update_reel_connections_puzzles_updated_at
  BEFORE UPDATE ON reel_connections_puzzles
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_connections_updated_at();
