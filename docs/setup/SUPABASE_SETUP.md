# Supabase Setup Instructions

## Step 1: Apply the Migration

### Option A: Using Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Cmd+Enter`
7. Verify success - you should see "Success. No rows returned"

### Option B: Using Supabase CLI (For production/automated deployments)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply migration
supabase db push
```

---

## Step 2: Verify Tables Were Created

1. In Supabase Dashboard, go to **Table Editor**
2. You should see three new tables:
   - `users`
   - `subscriptions`
   - `subscription_history`

3. Click on each table to verify the columns match the schema

---

## Step 3: Verify RLS is Enabled

1. In Supabase Dashboard, go to **Authentication** → **Policies**
2. For each table, verify you see the RLS policies:

### `users` table should have:
- ✅ "Users can view own data" (SELECT)
- ✅ "Users can update own data" (UPDATE)
- ✅ "Users can insert own data" (INSERT)

### `subscriptions` table should have:
- ✅ "Users can view own subscription" (SELECT)
- ✅ "Only server can modify subscriptions" (ALL - blocks client access)

### `subscription_history` table should have:
- ✅ "Users can view own history" (SELECT)
- ✅ "Only server can write history" (INSERT - blocks client access)

---

## Step 4: Test RLS Policies (CRITICAL)

### Test 1: Verify Anon Key Cannot Access User Data

1. Go to **SQL Editor**
2. Run this query (simulates unauthenticated access):

```sql
-- This should return NO ROWS (RLS blocks access)
SELECT * FROM users;
```

**Expected Result:** Empty result set (0 rows)

### Test 2: Create a Test User and Verify Access

```sql
-- 1. Create a test user (this bypasses RLS because we're using the SQL editor)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 2. Get the user's ID
SELECT id, email FROM auth.users WHERE email = 'test@example.com';

-- 3. Create a profile in users table
INSERT INTO users (id, email, full_name)
SELECT id, email, 'Test User'
FROM auth.users
WHERE email = 'test@example.com';

-- 4. Verify the user can see their own data (simulating authenticated request)
-- This requires setting the JWT context, which is easier to test via the API
```

### Test 3: Verify Service Role Can Modify Data

The service role key (used in your API routes) should be able to:
- Read all tables
- Write to all tables (bypasses RLS)

This will be tested when we create the API routes.

### Test 4: Verify Subscriptions Are Read-Only for Users

Try to insert a subscription from a "user" context (should fail):

```sql
-- This should FAIL because of RLS policy
INSERT INTO subscriptions (user_id, tier, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'buddypass',
  'active'
);
```

**Expected Result:** Error: "new row violates row-level security policy"

---

## Step 5: Get Environment Variables

### From Supabase Dashboard:

1. Go to **Settings** → **API**
2. Copy these values to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy from "Project API keys" → "anon public">
SUPABASE_SERVICE_ROLE_KEY=<copy from "Project API keys" → "service_role" - KEEP THIS SECRET!>
```

⚠️ **CRITICAL:** The `service_role` key has full database access and bypasses RLS.
- NEVER commit this to git
- NEVER expose it in client-side code
- Only use it in server-side API routes

---

## Step 6: Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Follow Supabase instructions to:
   - Create a Google Cloud project
   - Enable Google OAuth API
   - Get Client ID and Client Secret
   - Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Save credentials in Supabase dashboard

---

## Step 7: Configure Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Reset password
   - Magic link
3. Add your branding and domain

---

## Step 8: Security Checklist

Before proceeding to Phase 2, verify:

- [ ] All three tables created successfully
- [ ] RLS enabled on all tables (green checkmark in Table Editor)
- [ ] All RLS policies are active
- [ ] Test queries confirmed RLS is working
- [ ] Environment variables copied to `.env.local`
- [ ] Service role key is NOT in version control
- [ ] `.env.local` is in `.gitignore`

---

## Troubleshooting

### Issue: "relation 'users' already exists"
**Solution:** The table already exists. Either:
- Drop the existing table: `DROP TABLE users CASCADE;`
- Or skip this migration if tables are already set up correctly

### Issue: "permission denied for table users"
**Solution:** Ensure you're running the migration with sufficient permissions:
- Use the SQL Editor as the project owner
- Or use the service role key

### Issue: RLS policies not working
**Solution:**
1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Should show `rowsecurity = true` for all tables
3. If false, enable manually: `ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY;`

### Issue: Cannot insert test user
**Solution:** Use Supabase Dashboard → **Authentication** → **Users** → **Add User** instead

---

## Next Steps

Once this migration is successfully applied and tested:

1. ✅ Mark Phase 1 complete in `TANDEM_UNLIMITED_WEB_IMPLEMENTATION.md`
2. ✅ Update todo list
3. ➡️ Proceed to Phase 2: Create Supabase client utilities

---

**Questions or issues?** Check Supabase docs: https://supabase.com/docs/guides/database/tables
