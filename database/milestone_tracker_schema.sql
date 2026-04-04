-- Milestone Tracker Schema
-- Logs when platform-wide milestones are reached for historical tracking and social sharing

CREATE TABLE IF NOT EXISTS milestone_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_key text NOT NULL,        -- e.g. 'total_users', 'mini_puzzles_completed', 'first_discoveries'
  threshold integer NOT NULL,          -- e.g. 1000, 5000, 10000
  actual_value integer NOT NULL,       -- the actual value when milestone was reached
  reached_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,  -- optional context (e.g. which user triggered it)
  UNIQUE(milestone_key, threshold)     -- each milestone+threshold can only be reached once
);

-- Index for fast lookups by milestone key
CREATE INDEX IF NOT EXISTS idx_milestone_log_key ON milestone_log(milestone_key);

-- RLS
ALTER TABLE milestone_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (admin-only table)
CREATE POLICY "Service role full access" ON milestone_log
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE milestone_log IS 'Tracks when platform-wide milestones are reached (e.g. 10K users, 1K perfect solves)';
