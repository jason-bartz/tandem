-- ==============================================================================
-- Add 4 New Avatars: Buddy, Penelope, Quill, Tobey
-- ==============================================================================
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ==============================================================================

-- Insert Buddy
INSERT INTO avatars (id, display_name, bio, image_path, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'Buddy',
  'The most chill puzzle solver you''ll ever meet. Buddy''s relaxed approach somehow leads to a 500 day streak. Unfazed by difficulty, unimpressed by your panic.',
  '/images/avatars/Buddy.png',
  true,
  9
);

-- Insert Penelope
INSERT INTO avatars (id, display_name, bio, image_path, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'Penelope',
  'Mysterious solver who appears silently, finishes the puzzle, and vanishes. May knock your coffee over while you''re mid-thought.',
  '/images/avatars/Penelope.png',
  true,
  10
);

-- Insert Quill
INSERT INTO avatars (id, display_name, bio, image_path, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'Quill',
  'Calm and surprisingly sharp with vocabulary. Quill glides through word games with zero drama. Occasionally waddle away mid-puzzle for a piece of bread.',
  '/images/avatars/Quill.png',
  true,
  11
);

-- Insert Tobey
INSERT INTO avatars (id, display_name, bio, image_path, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'Tobey',
  'Enthusiastic and fluffy with boundless optimism about every single puzzle. Gets distracted easily but somehow still finishes first. Leaves curly hair on all the letter tiles.',
  '/images/avatars/Tobey.png',
  true,
  12
);

-- Verify the new avatars were added
SELECT display_name, bio, image_path, is_active, sort_order
FROM avatars
WHERE display_name IN ('Buddy', 'Penelope', 'Quill', 'Tobey')
ORDER BY sort_order;

-- Show total count
SELECT COUNT(*) as total_avatars FROM avatars WHERE is_active = true;
