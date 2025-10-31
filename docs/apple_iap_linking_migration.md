# Apple IAP Linking - Database Migration Guide

## Overview

This migration adds support for linking Apple In-App Purchase subscriptions to user accounts, enabling cross-platform subscription sync.

## Database Changes Required

### 1. Update `subscriptions` Table

Add the following columns to the `subscriptions` table:

```sql
-- Add Apple IAP transaction ID column
ALTER TABLE subscriptions
ADD COLUMN apple_original_transaction_id TEXT UNIQUE;

-- Add Apple user identifier column (from Sign in with Apple)
ALTER TABLE subscriptions
ADD COLUMN apple_user_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_subscriptions_apple_transaction
ON subscriptions(apple_original_transaction_id)
WHERE apple_original_transaction_id IS NOT NULL;

-- Add index for Apple user ID lookups
CREATE INDEX idx_subscriptions_apple_user
ON subscriptions(apple_user_id)
WHERE apple_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.apple_original_transaction_id IS
'Apple IAP original transaction ID - unique identifier for linking iOS purchases to accounts';

COMMENT ON COLUMN subscriptions.apple_user_id IS
'Apple user identifier from Sign in with Apple - used for cross-platform sync';
```

### 2. Update `users` Table

Add Apple Sign In support:

```sql
-- Add Apple user identifier
ALTER TABLE users
ADD COLUMN apple_user_id TEXT UNIQUE;

-- Add index
CREATE INDEX idx_users_apple_user_id
ON users(apple_user_id)
WHERE apple_user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.apple_user_id IS
'Apple user identifier from Sign in with Apple';
```

### 3. Run Migration in Supabase

#### Option A: Using Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste the SQL above
4. Run the migration

#### Option B: Using Supabase CLI

```bash
# Create a new migration file
supabase migration new apple_iap_linking

# Add the SQL to the generated file in supabase/migrations/
# Then run:
supabase db push
```

## Verification

After running the migration, verify the changes:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND column_name IN ('apple_original_transaction_id', 'apple_user_id');

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
AND indexname LIKE '%apple%';
```

## Row Level Security (RLS) Policies

Ensure RLS policies allow users to:

1. Read their own subscription data (including Apple fields)
2. Update their own subscription (for linking)

```sql
-- Policy for reading own subscription with Apple data
CREATE POLICY "Users can view own subscription"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Policy for linking IAP to account (update)
CREATE POLICY "Users can update own subscription"
ON subscriptions FOR UPDATE
USING (auth.uid() = user_id);
```

## Rollback Plan

If you need to rollback:

```sql
-- Remove columns (WARNING: This will delete data)
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS apple_original_transaction_id,
DROP COLUMN IF EXISTS apple_user_id;

-- Remove indexes
DROP INDEX IF EXISTS idx_subscriptions_apple_transaction;
DROP INDEX IF EXISTS idx_subscriptions_apple_user;

-- Remove users table changes
ALTER TABLE users
DROP COLUMN IF EXISTS apple_user_id;

DROP INDEX IF EXISTS idx_users_apple_user_id;
```

## Testing

After migration, test the following:

1. **iOS Purchase Without Account**
   - Purchase subscription on iOS without signing in
   - Verify `apple_original_transaction_id` is stored

2. **Sign In and Link**
   - Sign in with Apple
   - Call `/api/iap/link-to-user` endpoint
   - Verify subscription is linked to user account

3. **Cross-Platform Access**
   - Sign in on web with same Apple account
   - Verify subscription status is synced

4. **Restore Purchases**
   - Delete app and reinstall
   - Restore purchases
   - Verify subscription is recovered

## API Endpoints

The following endpoints work with these new fields:

- `POST /api/iap/link-to-user` - Link IAP receipt to authenticated user
- `GET /api/iap/link-to-user` - Check if user has linked IAP
- `POST /api/iap/validate-receipt` - Enhanced to store transaction ID
- `GET /api/subscription/status` - Returns Apple IAP status if linked

## Implementation Notes

1. **Transaction ID is Unique**: Each Apple transaction can only be linked to one user
2. **Conflict Resolution**: If a transaction is already linked, return 409 Conflict
3. **Lifetime Subscriptions**: Set expiry to 2099-12-31 for lifetime purchases
4. **Family Sharing**: May need additional logic for shared subscriptions (future enhancement)

## Next Steps

After running this migration:

1. Deploy the new API endpoint (`/api/iap/link-to-user/route.js`)
2. Update iOS subscription service to call link endpoint after purchase
3. Test the complete flow on TestFlight
4. Monitor logs for linking errors
5. Update user-facing documentation

## Support

If users have issues with linking:

1. Check `subscription_history` table for failed linking attempts
2. Verify `apple_original_transaction_id` matches Apple's receipt
3. Ensure user is authenticated when calling link endpoint
4. Check for conflicts (transaction already linked to different user)
