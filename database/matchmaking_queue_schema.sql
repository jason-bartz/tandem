-- Matchmaking Queue for Daily Alchemy Co-op Quick Match
-- Players enter a queue and are automatically paired with another player

CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL DEFAULT 'daily',
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  country_code VARCHAR(2),
  country_flag VARCHAR(8),
  matched_with UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES alchemy_coop_sessions(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast FIFO matching: find oldest waiting player in same mode
CREATE INDEX idx_mq_waiting ON matchmaking_queue(mode, created_at) WHERE status = 'waiting';

-- Prevent duplicate queue entries per user
CREATE UNIQUE INDEX idx_mq_one_per_user ON matchmaking_queue(user_id) WHERE status = 'waiting';

-- Cleanup stale entries
CREATE INDEX idx_mq_stale ON matchmaking_queue(last_heartbeat) WHERE status = 'waiting';

-- User lookup
CREATE INDEX idx_mq_user ON matchmaking_queue(user_id, status);

-- Enable RLS
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Users can read their own queue entries
CREATE POLICY "Users can read own queue entries"
  ON matchmaking_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own queue entry
CREATE POLICY "Users can create own queue entry"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own waiting entry (cancel)
CREATE POLICY "Users can update own queue entry"
  ON matchmaking_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own queue entries"
  ON matchmaking_queue FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Atomic Matching Function ───────────────────────────────────
-- Claims the oldest waiting player in the same mode, atomically.
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions when
-- multiple players try to match simultaneously.
CREATE OR REPLACE FUNCTION matchmaking_claim_partner(
  p_claimer_id UUID,
  p_mode VARCHAR,
  p_stale_threshold TIMESTAMPTZ
)
RETURNS SETOF matchmaking_queue
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE matchmaking_queue
  SET status = 'matched',
      matched_at = NOW()
  WHERE id = (
    SELECT id
    FROM matchmaking_queue
    WHERE status = 'waiting'
      AND user_id != p_claimer_id
      AND mode = p_mode
      AND last_heartbeat > p_stale_threshold
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
