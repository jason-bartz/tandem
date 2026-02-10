-- Migration: Update avatar image paths from /images/avatars/ to /avatars/
-- Also rename default-profile.png to default.png
-- Run this against your Supabase database after deploying the new file structure

-- Update avatars table
UPDATE avatars
SET image_path = REPLACE(image_path, '/images/avatars/', '/avatars/')
WHERE image_path LIKE '/images/avatars/%';

-- Update user_profiles table (avatar_image_path column)
UPDATE user_profiles
SET avatar_image_path = REPLACE(avatar_image_path, '/images/avatars/', '/avatars/')
WHERE avatar_image_path LIKE '/images/avatars/%';

-- Rename default-profile.png references to default.png
UPDATE avatars
SET image_path = REPLACE(image_path, 'default-profile.png', 'default.png')
WHERE image_path LIKE '%default-profile.png';

UPDATE user_profiles
SET avatar_image_path = REPLACE(avatar_image_path, 'default-profile.png', 'default.png')
WHERE avatar_image_path LIKE '%default-profile.png';
