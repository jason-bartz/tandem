-- Add wave-based release columns to bot_leaderboard_config
-- Replaces the old spread_throughout_day boolean with configurable wave schedule

ALTER TABLE bot_leaderboard_config
ADD COLUMN IF NOT EXISTS releases_per_day integer NOT NULL DEFAULT 6,
ADD COLUMN IF NOT EXISTS first_release_hour integer NOT NULL DEFAULT 6;

-- Add constraints
ALTER TABLE bot_leaderboard_config
ADD CONSTRAINT releases_per_day_range CHECK (releases_per_day >= 1 AND releases_per_day <= 12),
ADD CONSTRAINT first_release_hour_range CHECK (first_release_hour >= 0 AND first_release_hour <= 23);

COMMENT ON COLUMN bot_leaderboard_config.releases_per_day IS 'Number of bot release waves per day (1-12)';
COMMENT ON COLUMN bot_leaderboard_config.first_release_hour IS 'Hour in ET when first wave releases (0-23)';
