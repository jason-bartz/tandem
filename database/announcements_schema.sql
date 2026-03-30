-- =============================================================
-- Announcements Schema
-- Admin-managed banners displayed on the welcome screen
-- =============================================================

-- =============================================================
-- TABLE: announcements
-- =============================================================

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE announcements IS 'Admin-managed announcement banners for the welcome screen';
COMMENT ON COLUMN announcements.text IS 'The announcement message to display';
COMMENT ON COLUMN announcements.active IS 'Whether the announcement is currently visible';

-- Index for quick lookup of active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements (active) WHERE active = true;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Public read access for active announcements
CREATE POLICY "Anyone can read active announcements"
    ON announcements FOR SELECT
    USING (active = true);

-- Service role has full access
CREATE POLICY "Service role has full access to announcements"
    ON announcements FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================
-- TRIGGER: auto-update updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();
