#!/usr/bin/env node
// ==============================================================================
// Migrate Tandem Puzzles from Redis to Supabase
// ==============================================================================
// Migrates all Daily Tandem puzzles from Vercel KV/Redis/JSON storage to Supabase
//
// Usage:
//   node scripts/migrate-tandem-to-supabase.js           # Run migration
//   node scripts/migrate-tandem-to-supabase.js --dry-run # Preview without changes
//
// Prerequisites:
//   1. Run tandem_puzzles_schema.sql in Supabase first
//   2. Ensure KV_REST_API_URL/TOKEN and Supabase credentials are in .env.local
// ==============================================================================

require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const LAUNCH_DATE = new Date('2025-08-15T00:00:00Z');

// Environment variables
const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Calculate puzzle number from date
 */
function getPuzzleNumberForDate(dateStr) {
  const targetDate = new Date(dateStr + 'T00:00:00Z');
  const diffMs = targetDate - LAUNCH_DATE;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Transform Redis puzzle format to Supabase format
 */
function transformPuzzle(redisPuzzle, date) {
  // Handle both old and new puzzle formats
  let clues = [];

  if (redisPuzzle.puzzles && Array.isArray(redisPuzzle.puzzles)) {
    clues = redisPuzzle.puzzles.map((p) => ({
      emoji: p.emoji || '',
      answer: (p.answer || '').toUpperCase(),
      hint: p.hint || '',
    }));
  } else if (redisPuzzle.emojiPairs && redisPuzzle.words) {
    // Old format compatibility
    clues = redisPuzzle.emojiPairs.map((emoji, index) => ({
      emoji: emoji,
      answer: (redisPuzzle.words[index] || redisPuzzle.correctAnswers?.[index] || '').toUpperCase(),
      hint: redisPuzzle.hints?.[index] || '',
    }));
  }

  return {
    date,
    number: getPuzzleNumberForDate(date),
    theme: redisPuzzle.theme || 'Unknown Theme',
    clues,
    difficulty_rating: redisPuzzle.difficultyRating || null,
    difficulty_factors: redisPuzzle.difficultyFactors || null,
    created_by: redisPuzzle.createdBy || null,
    created_at: redisPuzzle.createdAt || new Date().toISOString(),
  };
}

/**
 * Load puzzles from JSON files as fallback
 */
function loadJsonPuzzles() {
  const puzzles = {};

  // Try all-puzzles.json first
  const allPuzzlesPath = path.join(process.cwd(), 'public', 'puzzles', 'all-puzzles.json');
  if (fs.existsSync(allPuzzlesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(allPuzzlesPath, 'utf8'));
      if (data.puzzles && Array.isArray(data.puzzles)) {
        data.puzzles.forEach((puzzle) => {
          if (puzzle.date) {
            puzzles[puzzle.date] = puzzle;
          }
        });
        console.log(`📄 Loaded ${Object.keys(puzzles).length} puzzles from all-puzzles.json`);
      }
    } catch (error) {
      console.log('⚠️  Could not parse all-puzzles.json:', error.message);
    }
  }

  // Try individual date files
  const puzzlesDir = path.join(process.cwd(), 'public', 'puzzles');
  if (fs.existsSync(puzzlesDir)) {
    const files = fs.readdirSync(puzzlesDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    files.forEach((file) => {
      const date = file.replace('.json', '');
      if (!puzzles[date]) {
        try {
          const filePath = path.join(puzzlesDir, file);
          puzzles[date] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
          console.log(`⚠️  Could not parse ${file}:`, error.message);
        }
      }
    });
    if (files.length > 0) {
      console.log(`📄 Found ${files.length} individual puzzle files`);
    }
  }

  return puzzles;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Tandem Puzzle Migration: Redis → Supabase');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  // Validate environment
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Initialize Supabase
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');

  // Check if table exists
  const { error: tableCheck } = await supabase.from('tandem_puzzles').select('id').limit(1);

  if (tableCheck) {
    console.error('❌ tandem_puzzles table not found');
    console.error('   Run database/tandem_puzzles_schema.sql in Supabase first');
    process.exit(1);
  }
  console.log('✅ tandem_puzzles table exists');

  // Results tracking
  const results = {
    kv: { found: 0, migrated: 0, failed: 0 },
    json: { found: 0, migrated: 0, failed: 0 },
    total: { success: 0, failed: 0, skipped: 0 },
  };

  const allPuzzles = new Map();

  // Phase 1: Load from Vercel KV
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Phase 1: Loading puzzles from Vercel KV');
  console.log('─────────────────────────────────────────────────────────────');

  if (kvUrl && kvToken) {
    try {
      // Use @vercel/kv which reads from environment variables automatically
      const keys = await kv.keys('puzzle:*');
      results.kv.found = keys.length;
      console.log(`✅ Vercel KV connected`);
      console.log(`📊 Found ${keys.length} puzzle keys in KV`);

      for (const key of keys) {
        const date = key.replace('puzzle:', '');
        try {
          const puzzleData = await kv.get(key);
          if (puzzleData) {
            // @vercel/kv automatically parses JSON
            allPuzzles.set(date, { source: 'kv', data: puzzleData });
          }
        } catch (error) {
          console.log(`⚠️  Could not fetch KV key ${key}:`, error.message);
          results.kv.failed++;
        }
      }

      console.log('✅ KV data loaded');
    } catch (error) {
      console.log('⚠️  Vercel KV connection failed:', error.message);
      console.log('   Continuing with JSON files only...');
    }
  } else {
    console.log('⚠️  No KV_REST_API_URL/TOKEN found, skipping Vercel KV');
  }

  // Phase 2: Load from JSON files (fill gaps)
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Phase 2: Loading puzzles from JSON files');
  console.log('─────────────────────────────────────────────────────────────');

  const jsonPuzzles = loadJsonPuzzles();
  results.json.found = Object.keys(jsonPuzzles).length;

  for (const [date, puzzle] of Object.entries(jsonPuzzles)) {
    if (!allPuzzles.has(date)) {
      allPuzzles.set(date, { source: 'json', data: puzzle });
    }
  }

  console.log(`📊 Total unique puzzles to migrate: ${allPuzzles.size}`);

  // Phase 3: Migrate to Supabase
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Phase 3: Migrating to Supabase');
  console.log('─────────────────────────────────────────────────────────────');

  // Sort dates for consistent output
  const sortedDates = Array.from(allPuzzles.keys()).sort();

  for (const date of sortedDates) {
    const { source, data } = allPuzzles.get(date);

    try {
      const transformed = transformPuzzle(data, date);

      // Validate required fields
      if (!transformed.theme || !transformed.clues || transformed.clues.length !== 4) {
        console.log(`⚠️  Skipping ${date}: Invalid puzzle structure`);
        results.total.skipped++;
        continue;
      }

      // Validate each clue has required fields
      const validClues = transformed.clues.every((c) => c.emoji && c.answer);
      if (!validClues) {
        console.log(`⚠️  Skipping ${date}: Missing emoji or answer in clues`);
        results.total.skipped++;
        continue;
      }

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('tandem_puzzles')
          .upsert(transformed, { onConflict: 'date' });

        if (error) {
          throw error;
        }
      }

      results.total.success++;
      if (source === 'kv') results.kv.migrated++;
      if (source === 'json') results.json.migrated++;

      console.log(`✓ ${date} (#${transformed.number}) - "${transformed.theme}" [${source}]`);
    } catch (error) {
      results.total.failed++;
      console.error(`✗ ${date}: ${error.message}`);
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Source: Vercel KV`);
  console.log(`    Found:    ${results.kv.found}`);
  console.log(`    Migrated: ${results.kv.migrated}`);
  console.log('');
  console.log(`  Source: JSON files`);
  console.log(`    Found:    ${results.json.found}`);
  console.log(`    Migrated: ${results.json.migrated}`);
  console.log('');
  console.log(`  Total:`);
  console.log(`    Success:  ${results.total.success}`);
  console.log(`    Failed:   ${results.total.failed}`);
  console.log(`    Skipped:  ${results.total.skipped}`);
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to perform actual migration');
  } else if (results.total.success > 0) {
    console.log('✅ Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: node scripts/verify-tandem-migration.js');
    console.log('  2. Set PUZZLE_SOURCE=both in Vercel');
    console.log('  3. Deploy and test');
  }

  console.log('');
}

// Run migration
migrate().catch((error) => {
  console.error('');
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
