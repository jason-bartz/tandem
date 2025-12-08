#!/usr/bin/env node
// ==============================================================================
// Verify Tandem Puzzle Migration
// ==============================================================================
// Verifies that puzzles were migrated correctly from Vercel KV to Supabase
//
// Usage:
//   node scripts/verify-tandem-migration.js
//
// Checks:
//   1. Puzzle count in Supabase matches expected
//   2. All puzzles have valid structure
//   3. Puzzle numbers are sequential and match dates
//   4. Sample comparison with Vercel KV (if available)
// ==============================================================================

require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');

// Configuration
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
 * Get expected puzzle count based on date range
 */
function getExpectedPuzzleCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today - LAUNCH_DATE;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Main verification function
 */
async function verify() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Tandem Puzzle Migration Verification');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const issues = [];

  // Initialize Supabase
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  // Check 1: Count puzzles in Supabase
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Check 1: Puzzle Count');
  console.log('─────────────────────────────────────────────────────────────');

  const { data: puzzles, error: countError } = await supabase
    .from('tandem_puzzles')
    .select('*')
    .order('date', { ascending: true });

  if (countError) {
    console.error('❌ Failed to query Supabase:', countError.message);
    process.exit(1);
  }

  const actualCount = puzzles.length;
  const expectedCount = getExpectedPuzzleCount();

  console.log(`  Expected puzzles: ~${expectedCount} (Aug 15 - today)`);
  console.log(`  Actual puzzles:   ${actualCount}`);

  if (actualCount === 0) {
    console.log('❌ No puzzles found in Supabase!');
    console.log('   Run migration script first: node scripts/migrate-tandem-to-supabase.js');
    process.exit(1);
  }

  if (actualCount < expectedCount * 0.9) {
    issues.push(`Missing puzzles: expected ~${expectedCount}, got ${actualCount}`);
    console.log(`⚠️  Fewer puzzles than expected`);
  } else {
    console.log('✅ Puzzle count looks reasonable');
  }

  // Check 2: Validate puzzle structure
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Check 2: Puzzle Structure');
  console.log('─────────────────────────────────────────────────────────────');

  let structureIssues = 0;

  for (const puzzle of puzzles) {
    const puzzleIssues = [];

    if (!puzzle.date) puzzleIssues.push('missing date');
    if (!puzzle.number) puzzleIssues.push('missing number');
    if (!puzzle.theme) puzzleIssues.push('missing theme');
    if (!puzzle.clues) puzzleIssues.push('missing clues');
    else if (!Array.isArray(puzzle.clues)) puzzleIssues.push('clues is not array');
    else if (puzzle.clues.length !== 4)
      puzzleIssues.push(`has ${puzzle.clues.length} clues, expected 4`);
    else {
      puzzle.clues.forEach((clue, i) => {
        if (!clue.emoji) puzzleIssues.push(`clue ${i + 1} missing emoji`);
        if (!clue.answer) puzzleIssues.push(`clue ${i + 1} missing answer`);
      });
    }

    if (puzzleIssues.length > 0) {
      structureIssues++;
      if (structureIssues <= 5) {
        console.log(`⚠️  ${puzzle.date}: ${puzzleIssues.join(', ')}`);
      }
    }
  }

  if (structureIssues > 5) {
    console.log(`   ... and ${structureIssues - 5} more issues`);
  }

  if (structureIssues === 0) {
    console.log('✅ All puzzles have valid structure');
  } else {
    issues.push(`${structureIssues} puzzles have structure issues`);
  }

  // Check 3: Verify puzzle number sequence
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Check 3: Puzzle Number Consistency');
  console.log('─────────────────────────────────────────────────────────────');

  let numberIssues = 0;

  for (const puzzle of puzzles) {
    const expectedNumber = getPuzzleNumberForDate(puzzle.date);
    if (puzzle.number !== expectedNumber) {
      numberIssues++;
      if (numberIssues <= 3) {
        console.log(`⚠️  ${puzzle.date}: number is ${puzzle.number}, expected ${expectedNumber}`);
      }
    }
  }

  if (numberIssues > 3) {
    console.log(`   ... and ${numberIssues - 3} more mismatches`);
  }

  if (numberIssues === 0) {
    console.log('✅ All puzzle numbers match their dates');
  } else {
    issues.push(`${numberIssues} puzzles have incorrect numbers`);
  }

  // Check 4: Date range coverage
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Check 4: Date Coverage');
  console.log('─────────────────────────────────────────────────────────────');

  const dates = new Set(puzzles.map((p) => p.date));
  const firstDate = puzzles[0]?.date;
  const lastDate = puzzles[puzzles.length - 1]?.date;

  console.log(`  First puzzle: ${firstDate}`);
  console.log(`  Last puzzle:  ${lastDate}`);

  // Check for gaps
  const gaps = [];
  if (puzzles.length > 1) {
    const startDate = new Date(firstDate);
    const endDate = new Date(lastDate);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!dates.has(dateStr)) {
        gaps.push(dateStr);
      }
    }
  }

  if (gaps.length > 0) {
    console.log(`⚠️  Found ${gaps.length} gaps in date sequence:`);
    gaps.slice(0, 5).forEach((g) => console.log(`     - ${g}`));
    if (gaps.length > 5) {
      console.log(`     ... and ${gaps.length - 5} more`);
    }
    issues.push(`${gaps.length} missing dates in sequence`);
  } else {
    console.log('✅ No gaps in date sequence');
  }

  // Check 5: Compare with Vercel KV (if available)
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Check 5: Vercel KV Comparison');
  console.log('─────────────────────────────────────────────────────────────');

  if (kvUrl && kvToken) {
    try {
      const kvKeys = await kv.keys('puzzle:*');
      console.log(`  Vercel KV puzzles: ${kvKeys.length}`);
      console.log(`  Supabase puzzles: ${actualCount}`);

      if (kvKeys.length > 0) {
        // Sample comparison
        const sampleKey = kvKeys[Math.floor(Math.random() * kvKeys.length)];
        const sampleDate = sampleKey.replace('puzzle:', '');
        const kvPuzzle = await kv.get(sampleKey);

        const { data: supabasePuzzle } = await supabase
          .from('tandem_puzzles')
          .select('*')
          .eq('date', sampleDate)
          .single();

        console.log('');
        console.log(`  Sample comparison (${sampleDate}):`);
        console.log(`    KV theme:       "${kvPuzzle?.theme}"`);
        console.log(`    Supabase theme: "${supabasePuzzle?.theme}"`);

        if (kvPuzzle?.theme === supabasePuzzle?.theme) {
          console.log('✅ Sample puzzle matches');
        } else {
          console.log('⚠️  Theme mismatch in sample');
        }
      }
    } catch (error) {
      console.log('⚠️  Could not connect to Vercel KV:', error.message);
    }
  } else {
    console.log('⚠️  Vercel KV not configured, skipping comparison');
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Verification Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (issues.length === 0) {
    console.log('✅ All checks passed!');
    console.log('');
    console.log('Migration verified successfully. Next steps:');
    console.log('  1. Set PUZZLE_SOURCE=both in Vercel');
    console.log('  2. Deploy and monitor');
    console.log('  3. After validation, set PUZZLE_SOURCE=supabase');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach((issue) => console.log(`   - ${issue}`));
    console.log('');
    console.log('Review issues before proceeding with deployment.');
  }

  console.log('');
}

// Run verification
verify().catch((error) => {
  console.error('');
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
