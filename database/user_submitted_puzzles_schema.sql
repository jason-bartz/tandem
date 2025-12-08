-- User Submitted Puzzles Schema
-- Run this SQL in your Supabase SQL editor or database client

-- Main submissions table
CREATE TABLE IF NOT EXISTS user_submitted_puzzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_edit', 'archived')),
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT
);

-- Groups table (4 groups per submission, same structure as reel_connections_groups)
CREATE TABLE IF NOT EXISTS user_submitted_puzzle_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES user_submitted_puzzles(id) ON DELETE CASCADE,
  connection TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easiest', 'easy', 'medium', 'hardest')),
  "order" INTEGER NOT NULL CHECK ("order" BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, "order")
);

-- Movies table (4 movies per group, same structure as reel_connections_movies)
CREATE TABLE IF NOT EXISTS user_submitted_puzzle_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES user_submitted_puzzle_groups(id) ON DELETE CASCADE,
  imdb_id TEXT NOT NULL,
  title TEXT NOT NULL,
  year TEXT,
  poster TEXT,
  "order" INTEGER NOT NULL CHECK ("order" BETWEEN 1 AND 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, "order")
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_submitted_puzzles_user ON user_submitted_puzzles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_submitted_puzzles_status ON user_submitted_puzzles(status);
CREATE INDEX IF NOT EXISTS idx_user_submitted_puzzles_submitted ON user_submitted_puzzles(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_submitted_groups_submission ON user_submitted_puzzle_groups(submission_id);
CREATE INDEX IF NOT EXISTS idx_user_submitted_movies_group ON user_submitted_puzzle_movies(group_id);

-- Add creator fields to reel_connections_puzzles for attribution
ALTER TABLE reel_connections_puzzles ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE reel_connections_puzzles ADD COLUMN IF NOT EXISTS is_user_submitted BOOLEAN DEFAULT false;
