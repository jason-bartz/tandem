-- Migration: Add has_completed_first_time_setup field to users table
-- This field tracks whether a user has completed the first-time account setup flow
-- which includes selecting their avatar after account creation

-- Add the column (defaults to false for existing users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_completed_first_time_setup BOOLEAN DEFAULT FALSE;

-- Set existing users who already have an avatar to true (they've already set up)
UPDATE users
SET has_completed_first_time_setup = TRUE
WHERE selected_avatar_id IS NOT NULL;

-- Add a comment to document the field
COMMENT ON COLUMN users.has_completed_first_time_setup IS
'Tracks whether user has completed first-time account setup (avatar selection). Set to true after initial avatar selection.';
