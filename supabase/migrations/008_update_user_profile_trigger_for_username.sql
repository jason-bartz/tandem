-- =====================================================
-- Update user profile trigger to include username
-- =====================================================
-- This migration updates the auto-create user profile
-- trigger to also extract and save the username field
-- from user metadata during signup.
--
-- Created: 2025-11-05
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Updated function to create user profile with username
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
  ON CONFLICT (id) DO UPDATE SET
    -- Update username if it's being set for the first time
    username = COALESCE(public.users.username, EXCLUDED.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);

  -- Create default leaderboard preferences (enabled by default)
  INSERT INTO public.leaderboard_preferences (user_id, enabled, show_on_global)
  VALUES (NEW.id, true, true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- =====================================================
-- Notes:
-- =====================================================
-- This updated trigger will:
-- 1. Extract username from user metadata during signup
-- 2. Create user profile with only username (no separate full_name)
-- 3. Automatically create leaderboard preferences (enabled by default)
-- 4. Handle conflicts gracefully
-- =====================================================
