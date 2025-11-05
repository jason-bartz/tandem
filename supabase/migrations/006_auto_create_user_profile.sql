-- =====================================================
-- Auto-create user profile on signup
-- =====================================================
-- This migration creates a trigger that automatically
-- creates a user profile when a new auth user is created.
-- This solves the RLS issue where auth.uid() is null
-- during email confirmation flow.
--
-- Created: 2025-11-04
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Grant necessary permissions
-- =====================================================

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- =====================================================
-- Notes:
-- =====================================================
-- This trigger will automatically create a user profile
-- in the public.users table whenever a new user signs up,
-- regardless of whether they've confirmed their email.
--
-- The SECURITY DEFINER ensures the function runs with
-- elevated privileges, bypassing RLS policies.
--
-- The ON CONFLICT DO NOTHING prevents errors if the
-- user profile already exists.
-- =====================================================
