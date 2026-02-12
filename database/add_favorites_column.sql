-- Add favorites column to daily_alchemy_creative_saves
-- Stores an array of element name strings (max 12) that the player has favorited
-- This links favorites to the save file rather than just browser localStorage
ALTER TABLE daily_alchemy_creative_saves
  ADD COLUMN IF NOT EXISTS favorites JSONB DEFAULT '[]';
