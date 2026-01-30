-- =============================================================================
-- MIGRATION: Fix Horoscopes RLS Policy
-- =============================================================================
-- This migration addresses the "RLS Policy Always True" warning for the
-- horoscopes table. The current policy allows ANY authenticated user to
-- insert horoscopes, which should likely be restricted to admins only.
--
-- IMPORTANT: Review this migration before running to confirm the intended
-- behavior for your application.
-- =============================================================================

-- Option 1: Remove the INSERT policy entirely (admin-only via service role)
-- This is the RECOMMENDED approach if only admins should add horoscopes
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.horoscopes;

-- Option 2: Alternative - Restrict to service role only (explicit)
-- Uncomment below if you want an explicit admin-only policy instead of just removing
/*
CREATE POLICY "horoscopes_admin_insert"
ON public.horoscopes FOR INSERT
TO service_role
WITH CHECK (true);
*/

-- =============================================================================
-- VERIFICATION
-- =============================================================================
/*
-- Check remaining policies on horoscopes table:
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'horoscopes';
*/

DO $$
BEGIN
  RAISE NOTICE 'Horoscopes INSERT policy removed. Only service role can now insert.';
END $$;
