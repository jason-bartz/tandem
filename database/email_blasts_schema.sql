-- =============================================================
-- Email Blasts Schema
-- Admin-managed email campaigns with scheduling and history
-- =============================================================

-- =============================================================
-- TABLE: email_blasts
-- =============================================================

CREATE TABLE IF NOT EXISTS email_blasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    html TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'update', 'promotion', 'announcement', 'maintenance')),
    tags TEXT[] DEFAULT '{}',
    recipient_type TEXT NOT NULL DEFAULT 'all' CHECK (recipient_type IN ('all', 'manual', 'import')),
    recipient_list TEXT[] DEFAULT '{}',
    recipient_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by TEXT,
    button_text TEXT,
    button_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE email_blasts IS 'Admin-managed email campaigns with scheduling and history tracking';
COMMENT ON COLUMN email_blasts.subject IS 'Email subject line';
COMMENT ON COLUMN email_blasts.body IS 'Plain text body content (used for preview and fallback)';
COMMENT ON COLUMN email_blasts.html IS 'Full rendered HTML email content';
COMMENT ON COLUMN email_blasts.category IS 'Email category: general, update, promotion, announcement, maintenance';
COMMENT ON COLUMN email_blasts.tags IS 'Array of tags for filtering and organization';
COMMENT ON COLUMN email_blasts.recipient_type IS 'How recipients were selected: all, manual, import';
COMMENT ON COLUMN email_blasts.recipient_list IS 'Array of recipient email addresses (stored for manual/import types)';
COMMENT ON COLUMN email_blasts.recipient_count IS 'Total number of recipients the email was sent to';
COMMENT ON COLUMN email_blasts.status IS 'Email status: draft, scheduled, sending, sent, failed';
COMMENT ON COLUMN email_blasts.scheduled_at IS 'When the email is scheduled to be sent (null for immediate)';
COMMENT ON COLUMN email_blasts.sent_at IS 'When the email was actually sent';
COMMENT ON COLUMN email_blasts.sent_by IS 'Admin username who sent the email';
COMMENT ON COLUMN email_blasts.button_text IS 'Optional CTA button text';
COMMENT ON COLUMN email_blasts.button_url IS 'Optional CTA button URL';
COMMENT ON COLUMN email_blasts.error_message IS 'Error details if sending failed';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_blasts_status ON email_blasts (status);
CREATE INDEX IF NOT EXISTS idx_email_blasts_category ON email_blasts (category);
CREATE INDEX IF NOT EXISTS idx_email_blasts_scheduled ON email_blasts (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_email_blasts_created ON email_blasts (created_at DESC);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE email_blasts ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin API uses service role)
CREATE POLICY "Service role has full access to email_blasts"
    ON email_blasts FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================
-- TRIGGER: auto-update updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION update_email_blasts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_blasts_updated_at
    BEFORE UPDATE ON email_blasts
    FOR EACH ROW
    EXECUTE FUNCTION update_email_blasts_updated_at();
