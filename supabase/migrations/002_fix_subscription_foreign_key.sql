-- =====================================================
-- Fix Subscriptions Foreign Key Constraint
-- =====================================================
-- Problem: subscriptions.user_id references users(id), but users table is empty
-- Solution: Change FK to reference auth.users(id) directly
-- =====================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Step 2: Add new foreign key pointing to auth.users
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Step 3: Same fix for subscription_history table
ALTER TABLE subscription_history
  DROP CONSTRAINT IF EXISTS subscription_history_user_id_fkey;

ALTER TABLE subscription_history
  ADD CONSTRAINT subscription_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- =====================================================
-- Migration complete!
-- Now webhooks can create subscriptions without needing
-- a corresponding row in the users table.
-- =====================================================
