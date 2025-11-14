-- ============================================
-- FIX FEEDBACK STATUS CONSTRAINT
-- ============================================
-- Problem: The database only allows 'new' and 'resolved' status values
-- Solution: Update constraint to include all four: 'new', 'in_review', 'resolved', 'archived'
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create a new query
-- 4. Paste and run this entire SQL script
-- ============================================

-- Drop the old constraint that's too restrictive
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Add the new constraint with all four status values
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('new', 'in_review', 'resolved', 'archived'));

-- Verify the constraint was created successfully
SELECT
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'feedback_status_check';

-- Show a success message
SELECT '✅ Constraint updated successfully! You can now use all four status values.' as result;
