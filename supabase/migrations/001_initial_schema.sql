-- =====================================================
-- Tandem Unlimited Web - Initial Database Schema
-- =====================================================
-- This migration creates the core tables for web authentication
-- and subscription management with STRICT Row Level Security.
--
-- SECURITY CRITICAL: All tables have RLS enabled to prevent
-- unauthorized access, even if API routes are compromised.
--
-- Created: 2025-10-22
-- =====================================================

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
-- Stores user profile data linked to Supabase Auth
-- RLS: Users can only read/update their own record

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Policy 1: Users can view their own data
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can update their own data (name, avatar)
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own record during signup
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
-- Stores active subscription data synced from Stripe
-- RLS: Users can READ their own subscription
--      Only SERVER (service role) can INSERT/UPDATE/DELETE

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('buddypass', 'bestfriends', 'soulmates')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'expired', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions table
-- Policy 1: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: NO INSERT/UPDATE/DELETE for regular users
-- Only server (service role) can modify subscriptions via API routes
CREATE POLICY "Only server can modify subscriptions"
  ON subscriptions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Note: Service role bypasses RLS, so server code CAN modify this table
-- This ensures all subscription changes go through our secure webhook handler

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Ensure one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription_per_user
  ON subscriptions(user_id)
  WHERE status = 'active';

-- =====================================================
-- 3. SUBSCRIPTION HISTORY TABLE
-- =====================================================
-- Audit trail of all subscription changes
-- RLS: Users can READ their own history
--      Only SERVER can write to this table

CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'subscription_renewed',
    'payment_succeeded',
    'payment_failed',
    'tier_changed'
  )),
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_history table
-- Policy 1: Users can view their own history
CREATE POLICY "Users can view own history"
  ON subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Only server can write to history
CREATE POLICY "Only server can write history"
  ON subscription_history
  FOR INSERT
  WITH CHECK (false);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- =====================================================
-- 4. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscriptions table
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. HELPER FUNCTIONS (Optional - for future use)
-- =====================================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > NOW()
  ORDER BY
    CASE tier
      WHEN 'soulmates' THEN 1
      WHEN 'bestfriends' THEN 2
      WHEN 'buddypass' THEN 3
    END
  LIMIT 1;

  RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. INITIAL DATA / SEED (Optional)
-- =====================================================

-- No seed data needed for production

-- =====================================================
-- 7. GRANTS (Ensure proper permissions)
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on users table to authenticated users (RLS will restrict to own data)
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Grant SELECT on subscriptions to authenticated users (RLS will restrict to own data)
GRANT SELECT ON subscriptions TO authenticated;

-- Grant SELECT on subscription_history to authenticated users (RLS will restrict to own data)
GRANT SELECT ON subscription_history TO authenticated;

-- =====================================================
-- SECURITY VERIFICATION CHECKLIST
-- =====================================================
--
-- ✅ RLS enabled on ALL tables
-- ✅ Users can only read/update their own data
-- ✅ Subscriptions are read-only for users, server-only writes
-- ✅ History is read-only for users, server-only writes
-- ✅ Service role bypasses RLS (used in secure API routes)
-- ✅ Anon key respects RLS (safe for client use)
-- ✅ Indexes created for performance
-- ✅ Triggers for timestamp updates
--
-- MANUAL TESTING REQUIRED:
-- 1. Try to query users table with anon key → should fail (no auth)
-- 2. Try to query own user with authenticated user → should succeed
-- 3. Try to query other user's data → should return empty
-- 4. Try to INSERT into subscriptions from client → should fail
-- 5. Try to UPDATE subscription from client → should fail
-- 6. Verify service role CAN modify all tables
--
-- =====================================================

-- Migration complete!
