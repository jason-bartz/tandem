-- Co-op Sessions Schema for Daily Alchemy
-- Tracks real-time cooperative play sessions between two players

CREATE TABLE alchemy_coop_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code VARCHAR(6) NOT NULL UNIQUE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    -- 'waiting' (host created, waiting for partner)
    -- 'active' (both players connected)
    -- 'ended' (manually ended or both disconnected)
  element_bank JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array of {name, emoji, isStarter, addedBy (user_id)}
  total_moves INTEGER NOT NULL DEFAULT 0,
  total_discoveries INTEGER NOT NULL DEFAULT 0,
  first_discoveries INTEGER NOT NULL DEFAULT 0,
  first_discovery_elements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coop_invite_code ON alchemy_coop_sessions(invite_code) WHERE status = 'waiting';
CREATE INDEX idx_coop_host ON alchemy_coop_sessions(host_user_id, status);
CREATE INDEX idx_coop_partner ON alchemy_coop_sessions(partner_user_id, status);

-- RLS
ALTER TABLE alchemy_coop_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read sessions they are part of
CREATE POLICY "coop_sessions_read_own"
  ON alchemy_coop_sessions FOR SELECT
  USING (auth.uid() = host_user_id OR auth.uid() = partner_user_id);

-- Users can create sessions as host
CREATE POLICY "coop_sessions_create"
  ON alchemy_coop_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- Participants can update sessions they are in
CREATE POLICY "coop_sessions_update"
  ON alchemy_coop_sessions FOR UPDATE
  USING (auth.uid() = host_user_id OR auth.uid() = partner_user_id);

-- Allow reading sessions by invite code for joining (before partner is set)
CREATE POLICY "coop_sessions_read_by_invite"
  ON alchemy_coop_sessions FOR SELECT
  USING (status = 'waiting');
