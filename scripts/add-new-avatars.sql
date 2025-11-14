-- Add 4 new avatars: Buddy, Penelope, Quill, and Tobey
-- These avatars have already been uploaded to public/images/avatars/

-- Insert Buddy
INSERT INTO avatars (display_name, bio, image_path, is_active, sort_order)
VALUES (
  'Buddy',
  'The most chill puzzle solver you''ll ever meet. Buddy''s relaxed approach somehow leads to a 500 day streak. Unfazed by difficulty, unimpressed by your panic.',
  '/images/avatars/Buddy.png',
  true,
  14
);

-- Insert Penelope
INSERT INTO avatars (display_name, bio, image_path, is_active, sort_order)
VALUES (
  'Penelope',
  'Mysterious solver who appears silently, finishes the puzzle, and vanishes. May knock your coffee over while you''re mid-thought.',
  '/images/avatars/Penelope.png',
  true,
  15
);

-- Insert Quill
INSERT INTO avatars (display_name, bio, image_path, is_active, sort_order)
VALUES (
  'Quill',
  'Calm and surprisingly sharp with vocabulary. Quill glides through word games with zero drama. Occasionally waddle away mid-puzzle for a piece of bread.',
  '/images/avatars/Quill.png',
  true,
  16
);

-- Insert Tobey
INSERT INTO avatars (display_name, bio, image_path, is_active, sort_order)
VALUES (
  'Tobey',
  'Enthusiastic and fluffy with boundless optimism about every single puzzle. Gets distracted easily but somehow still finishes first. Leaves curly hair on all the letter tiles.',
  '/images/avatars/Tobey.png',
  true,
  17
);

-- Verify the insertions
SELECT display_name, bio, image_path, sort_order
FROM avatars
WHERE display_name IN ('Buddy', 'Penelope', 'Quill', 'Tobey')
ORDER BY sort_order;
