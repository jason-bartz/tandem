-- Import Elements Database Schema
-- Version: 1.0
-- Created: 2026-01-28
--
-- This schema supports the imported Infinite Snake element data
-- COMPLETELY SEPARATE from the existing Daily Alchemy game tables

-- ============================================
-- 1. IMPORT ELEMENTS TABLE
-- ============================================
-- Stores all imported elements with their names and emojis

CREATE TABLE import_elements (
  id SERIAL PRIMARY KEY,

  -- Element data
  name VARCHAR(200) NOT NULL UNIQUE,
  emoji VARCHAR(30) DEFAULT '✨',

  -- Original ID from import (for reference)
  original_id INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_import_elements_name ON import_elements(name);
CREATE INDEX idx_import_elements_name_lower ON import_elements(LOWER(name));

-- ============================================
-- 2. IMPORT COMBINATIONS TABLE
-- ============================================
-- Stores all imported element combinations

CREATE TABLE import_combinations (
  id SERIAL PRIMARY KEY,

  -- Normalized key for bidirectional lookup (alphabetically sorted, lowercase)
  combination_key VARCHAR(510) NOT NULL UNIQUE,

  -- Individual elements
  element_a VARCHAR(200) NOT NULL,
  element_b VARCHAR(200) NOT NULL,

  -- Result
  result_element VARCHAR(200) NOT NULL,
  result_emoji VARCHAR(30) DEFAULT '✨',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_import_combinations_key ON import_combinations(combination_key);
CREATE INDEX idx_import_combinations_result ON import_combinations(result_element);
CREATE INDEX idx_import_combinations_element_a ON import_combinations(element_a);
CREATE INDEX idx_import_combinations_element_b ON import_combinations(element_b);

-- Composite index for finding all combinations involving an element
CREATE INDEX idx_import_combinations_elements ON import_combinations(element_a, element_b);

-- ============================================
-- 3. TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for import_elements
CREATE TRIGGER trigger_import_elements_updated_at
  BEFORE UPDATE ON import_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_import_updated_at();

-- Trigger for import_combinations
CREATE TRIGGER trigger_import_combinations_updated_at
  BEFORE UPDATE ON import_combinations
  FOR EACH ROW
  EXECUTE FUNCTION update_import_updated_at();

-- ============================================
-- 4. HELPER FUNCTION
-- ============================================

-- Function to normalize combination key (alphabetically sorted, lowercase)
CREATE OR REPLACE FUNCTION normalize_import_combination_key(a TEXT, b TEXT)
RETURNS TEXT AS $$
BEGIN
  IF LOWER(TRIM(a)) <= LOWER(TRIM(b)) THEN
    RETURN LOWER(TRIM(a)) || '|' || LOWER(TRIM(b));
  ELSE
    RETURN LOWER(TRIM(b)) || '|' || LOWER(TRIM(a));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE import_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_combinations ENABLE ROW LEVEL SECURITY;

-- Import Elements: Public read (admin write via service role)
CREATE POLICY "import_elements_public_read" ON import_elements
  FOR SELECT USING (true);

-- Import Combinations: Public read (admin write via service role)
CREATE POLICY "import_combinations_public_read" ON import_combinations
  FOR SELECT USING (true);

-- ============================================
-- NOTES
-- ============================================
--
-- 1. These tables are COMPLETELY SEPARATE from the Daily Alchemy tables
-- 2. Use service role key for all write operations (insert, update, delete)
-- 3. The combination_key format matches Daily Alchemy: "element_a|element_b" (lowercase, sorted)
-- 4. To import data, run the import script after creating these tables
