-- ==============================================================================
-- Test Mini Puzzle - Puzzle #1
-- Date: November 12, 2025
-- ==============================================================================
-- This is a simple test puzzle to validate the Daily Mini implementation
-- Grid layout:
--   C A T S BLACK
--   A BLACK O BLACK L
--   R E S T O
--   T BLACK A BLACK E
--   BLACK P E T S
-- ==============================================================================

INSERT INTO mini_puzzles (
  date,
  puzzle_number,
  grid,
  clues,
  difficulty_rating,
  theme
) VALUES (
  '2025-11-12',
  1,
  -- Grid: 5x5 array with letters and "BLACK" for black squares
  '[
    ["C","A","T","S","BLACK"],
    ["A","BLACK","O","BLACK","L"],
    ["R","E","S","T","O"],
    ["T","BLACK","A","BLACK","E"],
    ["BLACK","P","E","T","S"]
  ]'::jsonb,
  -- Clues: across and down with positions
  '{
    "across": [
      {
        "number": 1,
        "clue": "Feline pet",
        "answer": "CATS",
        "row": 0,
        "col": 0,
        "length": 4
      },
      {
        "number": 5,
        "clue": "Preposition indicating direction",
        "answer": "TO",
        "row": 1,
        "col": 2,
        "length": 2
      },
      {
        "number": 6,
        "clue": "Relaxation or sleep",
        "answer": "RESTO",
        "row": 2,
        "col": 0,
        "length": 5
      },
      {
        "number": 8,
        "clue": "Street, for short",
        "answer": "SA",
        "row": 3,
        "col": 2,
        "length": 2
      },
      {
        "number": 9,
        "clue": "Domesticated animals",
        "answer": "PETS",
        "row": 4,
        "col": 1,
        "length": 4
      }
    ],
    "down": [
      {
        "number": 1,
        "clue": "Shopping vehicle",
        "answer": "CART",
        "row": 0,
        "col": 0,
        "length": 4
      },
      {
        "number": 2,
        "clue": "Consumed food",
        "answer": "ATE",
        "row": 0,
        "col": 1,
        "length": 3
      },
      {
        "number": 3,
        "clue": "Opposite of bottom",
        "answer": "TOSS",
        "row": 0,
        "col": 2,
        "length": 4
      },
      {
        "number": 4,
        "clue": "Metric unit of volume",
        "answer": "SOLE",
        "row": 0,
        "col": 3,
        "length": 4
      },
      {
        "number": 7,
        "clue": "Possess",
        "answer": "OLE",
        "row": 2,
        "col": 4,
        "length": 3
      }
    ]
  }'::jsonb,
  'Easy',
  'Animals & Everyday Words'
)
ON CONFLICT (date) DO UPDATE SET
  grid = EXCLUDED.grid,
  clues = EXCLUDED.clues,
  difficulty_rating = EXCLUDED.difficulty_rating,
  theme = EXCLUDED.theme,
  updated_at = NOW();

-- Verify the puzzle was inserted
SELECT
  date,
  puzzle_number,
  difficulty_rating,
  theme,
  jsonb_array_length(grid) as grid_rows,
  jsonb_array_length(clues->'across') as across_count,
  jsonb_array_length(clues->'down') as down_count
FROM mini_puzzles
WHERE date = '2025-11-12';
