-- =====================================================
-- CLEANUP BOT DUPLICATES
-- Run this BEFORE fix_bot_duplicate_entries.sql to remove existing duplicates
-- =====================================================

-- First, let's see how many duplicates exist
SELECT
  bot_username,
  game_type,
  leaderboard_type,
  puzzle_date,
  COUNT(*) as duplicate_count
FROM leaderboard_entries
WHERE is_bot = TRUE AND bot_username IS NOT NULL
GROUP BY bot_username, game_type, leaderboard_type, puzzle_date
HAVING COUNT(*) > 1
ORDER BY puzzle_date DESC, game_type, bot_username;

-- Delete duplicate bot entries, keeping only the one with the best (lowest) score for daily_speed
-- and highest score for best_streak
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY bot_username, game_type, leaderboard_type, puzzle_date
      ORDER BY
        CASE
          WHEN leaderboard_type = 'daily_speed' THEN score  -- Keep lowest score
          ELSE -score  -- Keep highest score for streaks
        END,
        created_at ASC  -- Keep oldest if scores are equal
    ) as rn
  FROM leaderboard_entries
  WHERE is_bot = TRUE AND bot_username IS NOT NULL
)
DELETE FROM leaderboard_entries
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Verify duplicates are cleaned up
SELECT
  'Remaining duplicates:' as status,
  COUNT(*) as count
FROM (
  SELECT bot_username, game_type, leaderboard_type, puzzle_date
  FROM leaderboard_entries
  WHERE is_bot = TRUE AND bot_username IS NOT NULL
  GROUP BY bot_username, game_type, leaderboard_type, puzzle_date
  HAVING COUNT(*) > 1
) dups;
