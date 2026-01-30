-- =============================================================================
-- MIGRATION: Remove Daily Cryptic Puzzle Game
-- =============================================================================
-- This migration removes all database objects related to the Daily Cryptic puzzle
-- game which has been deprecated and removed from the application.
--
-- Objects removed:
-- - cryptic_puzzles table and its RLS policies
-- - user_cryptic_stats table (if exists)
-- - Cryptic-related functions (search_path warnings)
-- - Cryptic entries from leaderboard_entries
-- - Cryptic columns from bot_leaderboard_config
-- - Updates game_type constraint to exclude 'cryptic'
-- =============================================================================

-- Step 1: Delete cryptic leaderboard entries first (before constraint change)
DELETE FROM leaderboard_entries WHERE game_type = 'cryptic';

-- Step 2: Drop the old game_type constraint
ALTER TABLE leaderboard_entries
DROP CONSTRAINT IF EXISTS leaderboard_entries_game_type_check;

-- Step 3: Add new constraint without 'cryptic'
ALTER TABLE leaderboard_entries
ADD CONSTRAINT leaderboard_entries_game_type_check
CHECK (game_type IN ('tandem', 'mini', 'reel', 'soup'));

-- Step 4: Remove cryptic columns from bot_leaderboard_config
ALTER TABLE bot_leaderboard_config
DROP COLUMN IF EXISTS cryptic_min_score,
DROP COLUMN IF EXISTS cryptic_max_score;

-- Step 5: Drop cryptic-related functions (fixes search_path warnings)
DROP FUNCTION IF EXISTS public.update_cryptic_aggregate_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_cryptic_streak(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_completed_todays_cryptic(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_cryptic_stats_updated_at() CASCADE;

-- Step 6: Drop user_cryptic_stats table if exists
DROP TABLE IF EXISTS user_cryptic_stats CASCADE;

-- Step 7: Drop cryptic_puzzles table (removes RLS policy warnings)
DROP TABLE IF EXISTS cryptic_puzzles CASCADE;

-- =============================================================================
-- VERIFICATION QUERIES (run manually to verify cleanup)
-- =============================================================================
-- Check no cryptic entries remain:
-- SELECT COUNT(*) FROM leaderboard_entries WHERE game_type = 'cryptic';
--
-- Check constraint is updated:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'leaderboard_entries_game_type_check';
--
-- Check functions are removed:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_name LIKE '%cryptic%' AND routine_schema = 'public';
--
-- Check tables are removed:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name LIKE '%cryptic%' AND table_schema = 'public';
-- =============================================================================
