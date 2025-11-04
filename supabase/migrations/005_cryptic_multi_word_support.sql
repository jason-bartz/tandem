-- =====================================================
-- Tandem - Daily Cryptic Multi-Word Support
-- =====================================================
-- This migration adds support for multi-word phrases in cryptic puzzles
-- Examples: "DOWN IN THE DUMPS" (4,2,3,5), "BLUE FEATHERS" (4,8)
--
-- Created: January 2025
-- =====================================================

-- =====================================================
-- 1. ADD WORD_PATTERN COLUMN
-- =====================================================
-- word_pattern stores the length of each word in the answer
-- Example: [4, 2, 3, 5] for "DOWN IN THE DUMPS"
-- NULL for existing single-word puzzles (will be backfilled)

ALTER TABLE cryptic_puzzles
ADD COLUMN IF NOT EXISTS word_pattern INTEGER[];

-- Add comment for documentation
COMMENT ON COLUMN cryptic_puzzles.word_pattern IS
  'Array of word lengths for multi-word answers. Example: [4, 2, 3, 5] for "DOWN IN THE DUMPS"';

-- =====================================================
-- 2. UPDATE CONSTRAINTS
-- =====================================================
-- Remove the old constraint that prevents spaces in answers
ALTER TABLE cryptic_puzzles
DROP CONSTRAINT IF EXISTS answer_length_matches;

-- Add new constraint: answer length should match sum of word_pattern
-- OR match length field for backward compatibility
ALTER TABLE cryptic_puzzles
ADD CONSTRAINT answer_total_length_matches CHECK (
  -- Allow spaces in answer now
  char_length(REPLACE(answer, ' ', '')) = length
);

-- Note: We'll use a trigger instead of a CHECK constraint for word_pattern validation
-- because CHECK constraints cannot use subqueries in PostgreSQL

-- =====================================================
-- 3. BACKFILL EXISTING PUZZLES
-- =====================================================
-- For all existing single-word puzzles, set word_pattern to [length]
-- This ensures backward compatibility

UPDATE cryptic_puzzles
SET word_pattern = ARRAY[length]
WHERE word_pattern IS NULL
  AND answer NOT LIKE '% %';

-- For any existing multi-word answers (if they exist), calculate pattern
UPDATE cryptic_puzzles
SET word_pattern = (
  SELECT array_agg(char_length(word))
  FROM unnest(string_to_array(answer, ' ')) AS word
)
WHERE word_pattern IS NULL
  AND answer LIKE '% %';

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate word_pattern from an answer string
CREATE OR REPLACE FUNCTION calculate_word_pattern(answer_text TEXT)
RETURNS INTEGER[] AS $$
BEGIN
  RETURN (
    SELECT array_agg(char_length(word))
    FROM unnest(string_to_array(answer_text, ' ')) AS word
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate word_pattern matches answer
CREATE OR REPLACE FUNCTION validate_word_pattern(answer_text TEXT, pattern INTEGER[])
RETURNS BOOLEAN AS $$
DECLARE
  calculated_pattern INTEGER[];
BEGIN
  calculated_pattern := calculate_word_pattern(answer_text);
  RETURN calculated_pattern = pattern;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format answer with word lengths (for display)
-- Example: "DOWN IN THE DUMPS" -> "DOWN IN THE DUMPS (4,2,3,5)"
CREATE OR REPLACE FUNCTION format_answer_with_pattern(answer_text TEXT)
RETURNS TEXT AS $$
DECLARE
  pattern INTEGER[];
  pattern_str TEXT;
BEGIN
  pattern := calculate_word_pattern(answer_text);
  pattern_str := array_to_string(pattern, ',');

  IF array_length(pattern, 1) = 1 THEN
    -- Single word - just show length
    RETURN answer_text || ' (' || pattern[1] || ')';
  ELSE
    -- Multi-word - show full pattern
    RETURN answer_text || ' (' || pattern_str || ')';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 5. CREATE INDEXES
-- =====================================================
-- Index for filtering by single vs multi-word puzzles
CREATE INDEX IF NOT EXISTS idx_cryptic_puzzles_word_count
  ON cryptic_puzzles(array_length(word_pattern, 1));

-- =====================================================
-- 6. UPDATE VALIDATION TRIGGER
-- =====================================================
-- Trigger to auto-calculate word_pattern on insert/update if not provided
-- Also validates that word_pattern matches the answer
CREATE OR REPLACE FUNCTION auto_calculate_and_validate_word_pattern()
RETURNS TRIGGER AS $$
DECLARE
  calculated_pattern INTEGER[];
  word_array TEXT[];
  i INTEGER;
BEGIN
  -- If word_pattern is not set, calculate it from answer
  IF NEW.word_pattern IS NULL THEN
    NEW.word_pattern := calculate_word_pattern(NEW.answer);
  END IF;

  -- Validate that word_pattern matches answer
  word_array := string_to_array(NEW.answer, ' ');

  -- Check array length matches
  IF array_length(NEW.word_pattern, 1) != array_length(word_array, 1) THEN
    RAISE EXCEPTION 'word_pattern array length (%) does not match number of words in answer (%) for "%"',
      array_length(NEW.word_pattern, 1),
      array_length(word_array, 1),
      NEW.answer;
  END IF;

  -- Check each word length matches
  FOR i IN 1..array_length(word_array, 1) LOOP
    IF char_length(word_array[i]) != NEW.word_pattern[i] THEN
      RAISE EXCEPTION 'word_pattern[%] = % but word "%" has length %',
        i,
        NEW.word_pattern[i],
        word_array[i],
        char_length(word_array[i]);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_word_pattern ON cryptic_puzzles;
CREATE TRIGGER trigger_auto_calculate_word_pattern
  BEFORE INSERT OR UPDATE ON cryptic_puzzles
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_and_validate_word_pattern();

-- =====================================================
-- 7. VERIFICATION
-- =====================================================
-- Verify all existing puzzles have word_pattern set
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM cryptic_puzzles
  WHERE word_pattern IS NULL;

  IF missing_count > 0 THEN
    RAISE NOTICE 'Warning: % puzzles still have NULL word_pattern', missing_count;
  ELSE
    RAISE NOTICE 'Success: All puzzles have word_pattern set';
  END IF;
END $$;

-- =====================================================
-- MIGRATION VERIFICATION CHECKLIST
-- =====================================================
--
-- ✅ word_pattern column added to cryptic_puzzles
-- ✅ Constraints updated to allow spaces in answers
-- ✅ word_pattern validates against actual answer words
-- ✅ Existing puzzles backfilled with word_pattern
-- ✅ Helper functions created for word_pattern operations
-- ✅ Trigger auto-calculates word_pattern on insert/update
-- ✅ Indexes created for performance
-- ✅ Backward compatibility maintained (single-word puzzles work)
--
-- =====================================================

-- Migration complete!
