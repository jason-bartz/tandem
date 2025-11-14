-- PART 1: Run this first to see what we're working with
SELECT DISTINCT category FROM feedback;

-- PART 2: Drop the constraint (run this separately)
ALTER TABLE feedback DROP CONSTRAINT feedback_category_check;

-- PART 3: Update existing rows (run after Part 2)
UPDATE feedback SET category = 'Bug Report' WHERE category IN ('bug_report', 'BUG_REPORT', 'bug report');
UPDATE feedback SET category = 'Feature Request' WHERE category IN ('feature_request', 'FEATURE_REQUEST', 'feature request');
UPDATE feedback SET category = 'Game Feedback' WHERE category IN ('game_feedback', 'GAME_FEEDBACK', 'game feedback');
UPDATE feedback SET category = 'Other' WHERE category IN ('other', 'OTHER');

-- PART 4: Verify all rows are now in correct format
SELECT DISTINCT category FROM feedback;

-- PART 5: Add the new constraint (run after Part 4)
ALTER TABLE feedback ADD CONSTRAINT feedback_category_check
  CHECK (category IN ('Bug Report', 'Feature Request', 'Game Feedback', 'Other'));

-- PART 6: Final verification
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'feedback_category_check';
