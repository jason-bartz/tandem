-- =============================================================
-- Email Unsubscribes Schema
-- Tracks users who have opted out of email blasts
-- =============================================================

CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT DEFAULT 'link' CHECK (source IN ('link', 'admin', 'bounce'))
);

-- Unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_unsubscribes_email
    ON email_unsubscribes (LOWER(email));

-- Comments
COMMENT ON TABLE email_unsubscribes IS 'Tracks email addresses that have opted out of blast emails';
COMMENT ON COLUMN email_unsubscribes.email IS 'The unsubscribed email address';
COMMENT ON COLUMN email_unsubscribes.source IS 'How the unsubscribe happened: link (user clicked), admin (manually removed), bounce (email bounced)';

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to email_unsubscribes"
    ON email_unsubscribes FOR ALL
    USING (true)
    WITH CHECK (true);
