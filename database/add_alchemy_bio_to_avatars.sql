-- =====================================================
-- ADD ALCHEMY BIO TO AVATARS
-- Adds an alchemy_bio column for alchemy-themed character
-- bios shown on the standalone dailyalchemy.fun site
-- =====================================================

ALTER TABLE avatars
ADD COLUMN IF NOT EXISTS alchemy_bio TEXT DEFAULT NULL;

COMMENT ON COLUMN avatars.alchemy_bio IS 'Alchemy-themed character bio shown on dailyalchemy.fun standalone site. Falls back to bio if NULL.';
