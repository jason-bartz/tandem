-- Creative Mode Save Schema for Daily Alchemy
-- Version: 1.0
-- Created: 2026-01-26
--
-- This schema supports the Creative Mode save feature in Daily Alchemy.
-- Each Tandem Unlimited user can have one save slot that persists their
-- element bank and stats across sessions.

-- ============================================
-- CREATIVE MODE SAVES TABLE
-- ============================================

CREATE TABLE daily_alchemy_creative_saves (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Element bank (array of element objects with name and emoji)
  element_bank JSONB NOT NULL DEFAULT '[]',

  -- Stats
  total_moves INTEGER DEFAULT 0,
  total_discoveries INTEGER DEFAULT 0,
  first_discoveries INTEGER DEFAULT 0,
  first_discovery_elements JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_creative_saves_user ON daily_alchemy_creative_saves(user_id);
CREATE INDEX idx_creative_saves_updated ON daily_alchemy_creative_saves(updated_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE daily_alchemy_creative_saves ENABLE ROW LEVEL SECURITY;

-- Users can only access their own save
CREATE POLICY "creative_saves_user_select" ON daily_alchemy_creative_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creative_saves_user_insert" ON daily_alchemy_creative_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creative_saves_user_update" ON daily_alchemy_creative_saves
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "creative_saves_user_delete" ON daily_alchemy_creative_saves
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_creative_saves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_creative_saves_updated_at
  BEFORE UPDATE ON daily_alchemy_creative_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_creative_saves_updated_at();
