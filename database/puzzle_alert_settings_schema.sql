-- =============================================================
-- Puzzle Alert Settings Schema
-- Stores configuration for automated Discord alerts when
-- tomorrow's puzzles haven't been created yet
-- =============================================================

CREATE TABLE IF NOT EXISTS puzzle_alert_settings (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  webhook_url TEXT,                          -- Discord webhook URL for alerts
  alert_start_hour INTEGER DEFAULT 9,        -- Hour (0-23) in Eastern Time when alerts can start
  check_interval_hours INTEGER DEFAULT 4,    -- Hours between reminder alerts (0 = no reminders)
  games_to_monitor TEXT[] DEFAULT ARRAY['tandem', 'mini', 'reel', 'soup'],
  last_alert_sent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50)
);

-- RLS: service role only
ALTER TABLE puzzle_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "puzzle_alert_settings_service_role" ON puzzle_alert_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default row
INSERT INTO puzzle_alert_settings (enabled, alert_start_hour, check_interval_hours, games_to_monitor)
VALUES (false, 9, 4, ARRAY['tandem', 'mini', 'reel', 'soup'])
ON CONFLICT DO NOTHING;

COMMENT ON TABLE puzzle_alert_settings IS 'Configuration for automated puzzle creation deadline alerts';
COMMENT ON COLUMN puzzle_alert_settings.alert_start_hour IS 'Hour (0-23) in Eastern Time when alerts can begin firing';
COMMENT ON COLUMN puzzle_alert_settings.check_interval_hours IS 'Hours between reminder alerts while puzzles remain missing (0 = no reminders)';
