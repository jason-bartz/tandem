-- ============================================
-- ADD COMMENTS COLUMN TO FEEDBACK TABLE
-- ============================================
-- This migration adds a JSONB column to store comments as a JSON array
-- instead of using plain text in admin_notes
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create a new query
-- 4. Paste and run this entire SQL script
-- ============================================

-- Add the comments column as JSONB (allows for efficient JSON operations)
ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

-- Migrate existing admin_notes to comments format (if any exist)
-- This converts old text notes into a single comment object
UPDATE feedback
SET comments = jsonb_build_array(
  jsonb_build_object(
    'id', 'migrated-' || gen_random_uuid()::text,
    'author', 'Admin',
    'message', admin_notes,
    'createdAt', updated_at
  )
)
WHERE admin_notes IS NOT NULL
  AND admin_notes != ''
  AND (comments IS NULL OR comments = '[]'::jsonb);

-- Verify the migration
SELECT
  id,
  CASE
    WHEN admin_notes IS NOT NULL AND admin_notes != '' THEN 'Had notes'
    ELSE 'No notes'
  END as old_format,
  jsonb_array_length(COALESCE(comments, '[]'::jsonb)) as comment_count
FROM feedback
LIMIT 10;

-- Show success message
SELECT '✅ Comments column added successfully!' as result;
