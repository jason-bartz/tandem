-- Add platform column to users table
-- Tracks whether users access via 'web' or 'ios'
-- Updated on each sign-in from client-side platform detection

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT NULL;

-- Index for analytics queries (platform breakdown)
CREATE INDEX IF NOT EXISTS idx_users_platform ON users (platform) WHERE platform IS NOT NULL;
