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

-- ─── Atomic Matching Function (legacy — kept for rollback safety) ─
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

-- ─── Atomic Match + Session Creation ─────────────────────────────
-- Claims a waiting player AND creates the co-op session in a single
-- transaction. This prevents the race condition where the claim
-- succeeds but the session/queue updates fail, leaving the waiting
-- player in a 'matched' state with no session_id.
CREATE OR REPLACE FUNCTION matchmaking_claim_and_create_session(
  p_claimer_id UUID,
  p_mode VARCHAR,
  p_stale_threshold TIMESTAMPTZ,
  p_element_bank JSONB,
  p_claimer_country_code VARCHAR DEFAULT NULL,
  p_claimer_country_flag VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  matched_user_id UUID,
  matched_country_flag VARCHAR,
  new_session_id UUID,
  new_invite_code VARCHAR,
  new_element_bank JSONB,
  new_mode VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_matched_entry matchmaking_queue%ROWTYPE;
  v_session_id UUID;
  v_invite_code VARCHAR(6);
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempts INT := 0;
  v_existing UUID;
BEGIN
  -- Step 1: Atomically claim the oldest waiting player
  UPDATE matchmaking_queue
  SET status = 'matched',
      matched_at = NOW(),
      matched_with = p_claimer_id
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
  RETURNING * INTO v_matched_entry;

  -- No match found — return empty
  IF v_matched_entry.id IS NULL THEN
    RETURN;
  END IF;

  -- Step 2: Generate unique invite code
  LOOP
    v_invite_code := '';
    FOR i IN 1..6 LOOP
      v_invite_code := v_invite_code ||
        substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    END LOOP;

    SELECT id INTO v_existing
    FROM alchemy_coop_sessions
    WHERE invite_code = v_invite_code AND status = 'waiting';

    EXIT WHEN v_existing IS NULL;
    v_attempts := v_attempts + 1;
    EXIT WHEN v_attempts >= 5;
  END LOOP;

  -- Step 3: Create the co-op session with both players
  INSERT INTO alchemy_coop_sessions (
    invite_code, host_user_id, partner_user_id, status,
    element_bank, total_discoveries, mode, started_at, last_activity_at
  ) VALUES (
    v_invite_code, v_matched_entry.user_id, p_claimer_id, 'active',
    p_element_bank, 0, p_mode, NOW(), NOW()
  )
  RETURNING id INTO v_session_id;

  -- Step 4: Update the matched player's queue entry with session info
  UPDATE matchmaking_queue
  SET session_id = v_session_id
  WHERE id = v_matched_entry.id;

  -- Step 5: Insert the claimer's queue entry (already matched)
  INSERT INTO matchmaking_queue (
    user_id, mode, status, country_code, country_flag,
    matched_with, session_id, matched_at
  ) VALUES (
    p_claimer_id, p_mode, 'matched',
    p_claimer_country_code, p_claimer_country_flag,
    v_matched_entry.user_id, v_session_id, NOW()
  );

  -- Return the match result
  RETURN QUERY SELECT
    v_matched_entry.user_id,
    v_matched_entry.country_flag,
    v_session_id,
    v_invite_code,
    p_element_bank,
    p_mode;
END;
$$;
