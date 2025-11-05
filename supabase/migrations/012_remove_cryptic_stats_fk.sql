-- =====================================================
-- Remove Foreign Key Constraint from cryptic_stats
-- =====================================================
-- The foreign key constraint on cryptic_stats.puzzle_date
-- is too restrictive and causes 500 errors when trying to
-- save stats if the puzzle record doesn't exist yet.
--
-- This migration removes the constraint to allow stats to
-- be saved independently of puzzle records.
-- =====================================================

-- Drop the foreign key constraint
ALTER TABLE cryptic_stats
  DROP CONSTRAINT IF EXISTS cryptic_stats_puzzle_date_fkey;

-- The puzzle_date column will still be a DATE type and indexed,
-- but won't require a matching record in cryptic_puzzles
-- This is more flexible and won't block users from playing
