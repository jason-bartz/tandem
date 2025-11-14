-- Fix feedback status constraint to include all four status values
-- Current constraint only allows: 'new', 'resolved'
-- We need to add: 'in_review', 'archived'

-- Step 1: Check current constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name LIKE '%feedback%status%';

-- Step 2: Drop the old constraint
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Step 3: Add the new constraint with all four status values
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('new', 'in_review', 'resolved', 'archived'));

-- Step 4: Verify the new constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'feedback_status_check';
