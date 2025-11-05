-- Test Leaderboard by Direct Database Insert
-- Run this in Supabase Dashboard → SQL Editor

-- First, get your user ID
SELECT id, email, username FROM users WHERE email = 'YOUR_EMAIL_HERE';
-- Copy your user_id from the result

-- Insert a test leaderboard entry (replace YOUR_USER_ID with the UUID from above)
INSERT INTO leaderboard_entries (
  user_id,
  game_type,
  leaderboard_type,
  puzzle_date,
  score,
  metadata
)
VALUES (
  'YOUR_USER_ID'::uuid,  -- Replace with your actual user ID
  'cryptic',
  'daily_speed',
  '2025-11-05',
  30,  -- 30 seconds completion time
  '{"hintsUsed": 0, "attempts": 1}'::jsonb
)
ON CONFLICT (user_id, game_type, leaderboard_type, puzzle_date)
DO UPDATE SET
  score = EXCLUDED.score,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Verify it was inserted
SELECT
  le.id,
  u.username,
  le.game_type,
  le.score,
  le.metadata,
  le.created_at
FROM leaderboard_entries le
JOIN users u ON le.user_id = u.id
WHERE le.puzzle_date = '2025-11-05'
  AND le.game_type = 'cryptic'
ORDER BY le.score ASC;

-- Test the leaderboard function
SELECT * FROM get_daily_leaderboard('cryptic', '2025-11-05', 10);
