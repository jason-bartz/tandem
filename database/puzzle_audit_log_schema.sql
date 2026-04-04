-- =============================================================
-- Puzzle Audit Log Schema
-- Tracks who created, edited, and deleted puzzles across all game types
-- =============================================================

-- 1. Add created_by to tables that don't have it
-- (tandem_puzzles already has created_by VARCHAR(50))

ALTER TABLE mini_puzzles
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

ALTER TABLE reel_connections_puzzles
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- element_soup_puzzles has created_by as UUID, add a username column instead
ALTER TABLE element_soup_puzzles
  ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(50);

-- 2. Create the audit log table

CREATE TABLE IF NOT EXISTS puzzle_audit_log (
  id SERIAL PRIMARY KEY,
  puzzle_type VARCHAR(20) NOT NULL,  -- 'tandem', 'mini', 'reel', 'soup'
  puzzle_date DATE NOT NULL,
  action VARCHAR(20) NOT NULL,       -- 'created', 'updated', 'deleted'
  actor_username VARCHAR(50) NOT NULL,
  actor_full_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_puzzle
  ON puzzle_audit_log(puzzle_type, puzzle_date);

CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON puzzle_audit_log(created_at DESC);

-- RLS: service role only (admin routes use service role key)
ALTER TABLE puzzle_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (admin API routes use service role)
CREATE POLICY "audit_log_service_role" ON puzzle_audit_log
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE puzzle_audit_log IS 'Tracks all admin puzzle create/update/delete actions';
COMMENT ON COLUMN puzzle_audit_log.puzzle_type IS 'Game type: tandem, mini, reel, soup';
COMMENT ON COLUMN puzzle_audit_log.action IS 'Action performed: created, updated, deleted';
COMMENT ON COLUMN puzzle_audit_log.actor_username IS 'Admin username who performed the action';
