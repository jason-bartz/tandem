-- ==============================================================================
-- Fix Avatar Image Paths
-- ==============================================================================
-- This script corrects malformed avatar paths in the database
-- Old format: /avatars//images/avatars/nutmeg.png (incorrect)
-- New format: /images/avatars/nutmeg.png (correct)
-- ==============================================================================

-- Update any paths that start with /avatars/ to remove that prefix
UPDATE avatars
SET image_path = REPLACE(image_path, '/avatars//', '/')
WHERE image_path LIKE '/avatars//%';

-- Also fix any paths that just start with /avatars/images
UPDATE avatars
SET image_path = REPLACE(image_path, '/avatars/images', '/images')
WHERE image_path LIKE '/avatars/images%';

-- Verify the fix
SELECT display_name, image_path
FROM avatars
ORDER BY sort_order;
