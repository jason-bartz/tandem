-- Daily Mini - Sample Puzzles
-- Two simple 5x5 crossword puzzles for testing
-- Execute after mini_schema.sql

-- =====================================================
-- SAMPLE PUZZLE 1: Today (2025-11-17)
-- =====================================================

INSERT INTO mini_puzzles (date, number, grid, clues, solution, difficulty, created_at, updated_at)
VALUES (
  '2025-11-17',
  1,
  -- Grid (user sees this - no letters revealed, just structure)
  '[
    ["","","","",""],
    ["","","","","■"],
    ["","","","","■"],
    ["■","■","■","■","■"],
    ["■","■","■","■","■"]
  ]'::jsonb,
  -- Clues
  '{
    "across": [
      {"number": 1, "clue": "Playing deck items", "answer": "CARDS", "row": 0, "col": 0, "length": 5},
      {"number": 4, "clue": "Region or zone", "answer": "AREA", "row": 1, "col": 0, "length": 4},
      {"number": 5, "clue": "Wine varieties", "answer": "REDS", "row": 2, "col": 0, "length": 4}
    ],
    "down": [
      {"number": 1, "clue": "Automobile", "answer": "CAR", "row": 0, "col": 0, "length": 3},
      {"number": 2, "clue": "Exist", "answer": "ARE", "row": 0, "col": 1, "length": 3},
      {"number": 3, "clue": "Crimson color", "answer": "RED", "row": 0, "col": 2, "length": 3}
    ]
  }'::jsonb,
  -- Solution (correct answers)
  '[
    ["C","A","R","D","S"],
    ["A","R","E","A","■"],
    ["R","E","D","S","■"],
    ["■","■","■","■","■"],
    ["■","■","■","■","■"]
  ]'::jsonb,
  'easy',
  NOW(),
  NOW()
)
ON CONFLICT (date) DO UPDATE SET
  number = EXCLUDED.number,
  grid = EXCLUDED.grid,
  clues = EXCLUDED.clues,
  solution = EXCLUDED.solution,
  difficulty = EXCLUDED.difficulty,
  updated_at = NOW();

-- =====================================================
-- SAMPLE PUZZLE 2: Tomorrow (2025-11-18)
-- =====================================================

INSERT INTO mini_puzzles (date, number, grid, clues, solution, difficulty, created_at, updated_at)
VALUES (
  '2025-11-18',
  2,
  -- Grid (user sees this - no letters revealed, just structure)
  '[
    ["","","","",""],
    ["","","","","■"],
    ["","","","","■"],
    ["■","■","■","■","■"],
    ["■","■","■","■","■"]
  ]'::jsonb,
  -- Clues
  '{
    "across": [
      {"number": 1, "clue": "Award or insignia", "answer": "BADGE", "row": 0, "col": 0, "length": 5},
      {"number": 4, "clue": "Region", "answer": "AREA", "row": 1, "col": 0, "length": 4},
      {"number": 5, "clue": "Plural of ten", "answer": "TENS", "row": 2, "col": 0, "length": 4}
    ],
    "down": [
      {"number": 1, "clue": "Flying mammal", "answer": "BAT", "row": 0, "col": 0, "length": 3},
      {"number": 2, "clue": "Exist or be", "answer": "ARE", "row": 0, "col": 1, "length": 3},
      {"number": 3, "clue": "Animal lair", "answer": "DEN", "row": 0, "col": 2, "length": 3},
      {"number": 6, "clue": "Fuel or vapor", "answer": "GAS", "row": 0, "col": 3, "length": 3}
    ]
  }'::jsonb,
  -- Solution (correct answers)
  '[
    ["B","A","D","G","E"],
    ["A","R","E","A","■"],
    ["T","E","N","S","■"],
    ["■","■","■","■","■"],
    ["■","■","■","■","■"]
  ]'::jsonb,
  'easy',
  NOW(),
  NOW()
)
ON CONFLICT (date) DO UPDATE SET
  number = EXCLUDED.number,
  grid = EXCLUDED.grid,
  clues = EXCLUDED.clues,
  solution = EXCLUDED.solution,
  difficulty = EXCLUDED.difficulty,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that puzzles were inserted
SELECT
  date,
  number,
  difficulty,
  jsonb_array_length(clues->'across') as across_clues,
  jsonb_array_length(clues->'down') as down_clues
FROM mini_puzzles
WHERE date IN ('2025-11-17', '2025-11-18')
ORDER BY date;

-- Verify grid structure (should be 5x5)
SELECT
  date,
  jsonb_array_length(grid) as grid_rows,
  jsonb_array_length(grid->0) as grid_cols
FROM mini_puzzles
WHERE date IN ('2025-11-17', '2025-11-18')
ORDER BY date;

-- =====================================================
-- NOTES
-- =====================================================

/*

PUZZLE 1 LAYOUT (2025-11-17):
  C A R D S
  A R E A ■
  R E D S ■
  ■ ■ ■ ■ ■
  ■ ■ ■ ■ ■

Across:
  1. CARDS - Playing deck items
  4. AREA - Region or zone
  5. REDS - Wine varieties

Down:
  1. CAR - Automobile
  2. ARE - Exist
  3. RED - Crimson color

PUZZLE 2 LAYOUT (2025-11-18):
  B A D G E
  A R E A ■
  T E N S ■
  ■ ■ ■ ■ ■
  ■ ■ ■ ■ ■

Across:
  1. BADGE - Award or insignia
  4. AREA - Region
  5. TENS - Plural of ten

Down:
  1. BAT - Flying mammal
  2. ARE - Exist or be
  3. DEN - Animal lair
  6. GAS - Fuel or vapor

Both puzzles use:
- Simple, common English words
- Beginner-friendly difficulty
- Minimal black squares (only bottom 2 rows and right column)
- Standard crossword conventions
- Clear, unambiguous clues

To add more puzzles:
1. Create 5x5 grid with black squares marked as "■"
2. Ensure all non-black cells are part of at least one word
3. Number cells where words begin (across and/or down)
4. Write clear, concise clues
5. Test that all words intersect correctly

*/
