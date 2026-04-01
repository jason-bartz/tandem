-- =============================================================
-- Admin Users Schema
-- Multi-user admin system with role hierarchy
-- =============================================================

-- =============================================================
-- TABLE: admin_users
-- =============================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    avatar_id TEXT REFERENCES avatars(id) ON DELETE SET NULL,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE admin_users IS 'Admin panel users with role-based access control';
COMMENT ON COLUMN admin_users.username IS 'Unique login username';
COMMENT ON COLUMN admin_users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN admin_users.full_name IS 'Display name shown in greeting and audit trails';
COMMENT ON COLUMN admin_users.email IS 'Email for password resets and notifications';
COMMENT ON COLUMN admin_users.role IS 'Role hierarchy: owner > admin > editor';
COMMENT ON COLUMN admin_users.is_active IS 'Soft delete / deactivation flag';
COMMENT ON COLUMN admin_users.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN admin_users.password_reset_token IS 'Hashed token for password reset flow';
COMMENT ON COLUMN admin_users.password_reset_expires IS 'Expiry time for password reset token';
COMMENT ON COLUMN admin_users.avatar_id IS 'FK to avatars table for profile picture';
COMMENT ON COLUMN admin_users.created_by IS 'UUID of the admin who created this user';

-- =============================================================
-- ROLE HIERARCHY
-- =============================================================
-- owner:  Full access. Can manage all admins, delete users, system config.
--         Only one owner should exist (the original admin).
-- admin:  Can manage puzzles, content, users, analytics. Can invite editors.
--         Cannot manage other admins or the owner.
-- editor: Can create/edit puzzles and view analytics only.
--         Cannot manage users, send emails, or change settings.

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users (role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token ON admin_users (password_reset_token) WHERE password_reset_token IS NOT NULL;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin API uses service role)
CREATE POLICY "Service role has full access to admin_users"
    ON admin_users FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================
-- TRIGGER: auto-update updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_users_updated_at();
