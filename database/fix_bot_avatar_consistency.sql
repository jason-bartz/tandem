-- =====================================================
-- FIX BOT AVATAR CONSISTENCY
-- Ensures each bot username has the same avatar across all games
-- Run this after deploying the deterministic avatar code
-- =====================================================

-- First, let's see which bots have inconsistent avatars across games
SELECT
  bot_username,
  COUNT(DISTINCT bot_avatar_id) as avatar_count,
  array_agg(DISTINCT bot_avatar_id) as avatars,
  array_agg(DISTINCT game_type) as games
FROM leaderboard_entries
WHERE is_bot = TRUE AND bot_username IS NOT NULL
GROUP BY bot_username
HAVING COUNT(DISTINCT bot_avatar_id) > 1
ORDER BY bot_username;

-- For each bot username, pick one canonical avatar (the most frequently used one)
-- and update all entries for that username to use it
WITH canonical_avatars AS (
  SELECT DISTINCT ON (bot_username)
    bot_username,
    bot_avatar_id as canonical_avatar_id
  FROM leaderboard_entries
  WHERE is_bot = TRUE AND bot_username IS NOT NULL
  GROUP BY bot_username, bot_avatar_id
  ORDER BY bot_username, COUNT(*) DESC
)
UPDATE leaderboard_entries le
SET bot_avatar_id = ca.canonical_avatar_id
FROM canonical_avatars ca
WHERE le.bot_username = ca.bot_username
  AND le.is_bot = TRUE
  AND le.bot_avatar_id != ca.canonical_avatar_id;

-- Verify the fix - should return no rows
SELECT
  bot_username,
  COUNT(DISTINCT bot_avatar_id) as avatar_count
FROM leaderboard_entries
WHERE is_bot = TRUE AND bot_username IS NOT NULL
GROUP BY bot_username
HAVING COUNT(DISTINCT bot_avatar_id) > 1;
