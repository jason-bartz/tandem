-- =============================================================================
-- MIGRATION: Enable RLS on bot_leaderboard_config table
-- =============================================================================
-- This migration fixes the Supabase security warning:
-- "Table `public.bot_leaderboard_config` is public, but RLS has not been enabled."
--
-- The bot_leaderboard_config table stores admin settings for synthetic
-- leaderboard entries. It should only be accessed server-side via the
-- service role key (which bypasses RLS). No public access is needed.
--
-- Safe to run multiple times (idempotent)
-- =============================================================================

-- Enable RLS on the table
ALTER TABLE public.bot_leaderboard_config ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (optional extra security)
ALTER TABLE public.bot_leaderboard_config FORCE ROW LEVEL SECURITY;

-- Create explicit "deny all" policies to satisfy Supabase linter
-- These policies return FALSE for all operations, blocking all access
-- except via service role key (which bypasses RLS)

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Deny all select on bot_leaderboard_config" ON public.bot_leaderboard_config;
DROP POLICY IF EXISTS "Deny all insert on bot_leaderboard_config" ON public.bot_leaderboard_config;
DROP POLICY IF EXISTS "Deny all update on bot_leaderboard_config" ON public.bot_leaderboard_config;
DROP POLICY IF EXISTS "Deny all delete on bot_leaderboard_config" ON public.bot_leaderboard_config;

-- Deny SELECT for all roles
CREATE POLICY "Deny all select on bot_leaderboard_config"
  ON public.bot_leaderboard_config
  FOR SELECT
  TO public
  USING (false);

-- Deny INSERT for all roles
CREATE POLICY "Deny all insert on bot_leaderboard_config"
  ON public.bot_leaderboard_config
  FOR INSERT
  TO public
  WITH CHECK (false);

-- Deny UPDATE for all roles
CREATE POLICY "Deny all update on bot_leaderboard_config"
  ON public.bot_leaderboard_config
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

-- Deny DELETE for all roles
CREATE POLICY "Deny all delete on bot_leaderboard_config"
  ON public.bot_leaderboard_config
  FOR DELETE
  TO public
  USING (false);

-- =============================================================================
-- VERIFICATION (run manually after migration)
-- =============================================================================
/*
-- Verify RLS is enabled:
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'bot_leaderboard_config';

-- Should return: public | bot_leaderboard_config | true

-- Verify policies exist:
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'bot_leaderboard_config';

-- Should return 4 rows (SELECT, INSERT, UPDATE, DELETE) all with qual = false
*/

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'RLS enabled on bot_leaderboard_config table';
  RAISE NOTICE 'Added 4 deny-all policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE 'Table now only accessible via service role key';
  RAISE NOTICE '=============================================================';
END $$;
