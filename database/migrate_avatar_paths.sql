-- Migration: Update avatar image paths from /images/avatars/ to /avatars/
-- Also rename default-profile.png to default.png
-- Run this against your Supabase database after deploying the new file structure

-- Update avatars table
UPDATE avatars
SET image_path = REPLACE(image_path, '/images/avatars/', '/avatars/')
WHERE image_path LIKE '/images/avatars/%';

-- Rename default-profile.png references to default.png
UPDATE avatars
SET image_path = REPLACE(image_path, 'default-profile.png', 'default.png')
WHERE image_path LIKE '%default-profile.png';
