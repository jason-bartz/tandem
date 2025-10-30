#!/usr/bin/env node

/**
 * Retroactive Difficulty Assessment Script
 *
 * This script assesses the difficulty of all existing puzzles and updates them in the database.
 * It reads puzzles from all-puzzles.json, calls the AI service to assess each puzzle,
 * and updates the database with the difficulty ratings.
 *
 * Usage:
 *   node scripts/assess-all-puzzles.js [--dry-run] [--start=YYYY-MM-DD] [--end=YYYY-MM-DD]
 *
 * Options:
 *   --dry-run       Show what would be assessed without making changes
 *   --start         Start date for assessment (default: first puzzle)
 *   --end           End date for assessment (default: last puzzle)
 *   --delay         Delay between requests in ms (default: 2000)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const delay = parseInt(args.find((arg) => arg.startsWith('--delay='))?.split('=')[1]) || 2000;
const startDate = args.find((arg) => arg.startsWith('--start='))?.split('=')[1];
const endDate = args.find((arg) => arg.startsWith('--end='))?.split('=')[1];

console.log('🎯 Tandem Puzzle Difficulty Assessment Script');
console.log('='.repeat(60));
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
console.log(`Delay between requests: ${delay}ms`);
if (startDate) console.log(`Start date: ${startDate}`);
if (endDate) console.log(`End date: ${endDate}`);
console.log('='.repeat(60));
console.log();

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && match[1] && match[2]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.error(
    '❌ .env.local not found. Please create it with ANTHROPIC_API_KEY and ADMIN_SECRET'
  );
  process.exit(1);
}

// Verify required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

if (!process.env.ADMIN_SECRET && !isDryRun) {
  console.error('❌ ADMIN_SECRET not found in environment (required for live mode)');
  process.exit(1);
}

console.log();

// Load puzzles from all-puzzles.json
const allPuzzlesPath = path.join(__dirname, '..', 'public', 'puzzles', 'all-puzzles.json');
if (!fs.existsSync(allPuzzlesPath)) {
  console.error('❌ all-puzzles.json not found at:', allPuzzlesPath);
  process.exit(1);
}

const allPuzzlesData = JSON.parse(fs.readFileSync(allPuzzlesPath, 'utf8'));
let puzzles = allPuzzlesData.puzzles || [];

console.log(`📊 Loaded ${puzzles.length} puzzles from all-puzzles.json`);

// Filter puzzles by date range if specified
if (startDate || endDate) {
  puzzles = puzzles.filter((puzzle) => {
    if (startDate && puzzle.date < startDate) return false;
    if (endDate && puzzle.date > endDate) return false;
    return true;
  });
  console.log(`📊 Filtered to ${puzzles.length} puzzles in date range`);
}

// Filter out puzzles that already have difficulty ratings (unless --force flag is set)
const forceReassess = args.includes('--force');
const puzzlesToAssess = forceReassess ? puzzles : puzzles.filter((p) => !p.difficultyRating);

console.log(`📊 ${puzzlesToAssess.length} puzzles need assessment`);
if (!forceReassess && puzzlesToAssess.length < puzzles.length) {
  console.log(
    `   (${puzzles.length - puzzlesToAssess.length} puzzles already have ratings, use --force to reassess)`
  );
}
console.log();

if (puzzlesToAssess.length === 0) {
  console.log('✅ All puzzles already have difficulty ratings!');
  process.exit(0);
}

// Import AI service dynamically
const aiServiceModule = await import('../src/services/ai.service.js');
const aiService = aiServiceModule.default;

// Check if AI service is enabled
if (!aiService.isEnabled()) {
  console.error('❌ AI service is not enabled. Check your ANTHROPIC_API_KEY.');
  process.exit(1);
}

console.log('✅ AI service is enabled and ready');
console.log();

// Progress tracking
let assessed = 0;
let failed = 0;
const results = [];

// Assess each puzzle
for (const puzzle of puzzlesToAssess) {
  const progress = `[${assessed + failed + 1}/${puzzlesToAssess.length}]`;

  try {
    console.log(`${progress} Assessing puzzle: ${puzzle.date} - "${puzzle.theme}"`);

    if (isDryRun) {
      console.log(`   DRY RUN: Would assess this puzzle`);
      assessed++;
      continue;
    }

    // Call AI service to assess difficulty
    const assessment = await aiService.assessDifficulty({
      theme: puzzle.theme,
      puzzles: puzzle.puzzles,
    });

    console.log(`   ✅ Rating: ${assessment.rating}`);
    console.log(
      `   📊 Factors: Theme=${assessment.factors.themeComplexity}/5, Vocab=${assessment.factors.vocabularyLevel}/5, Emoji=${assessment.factors.emojiClarity}/5, Hint=${assessment.factors.hintDirectness || 'N/A'}/5`
    );

    // Update puzzle object
    puzzle.difficultyRating = assessment.rating;
    puzzle.difficultyFactors = assessment.factors;

    results.push({
      date: puzzle.date,
      theme: puzzle.theme,
      rating: assessment.rating,
      success: true,
    });

    assessed++;

    // Delay to avoid rate limiting
    if (assessed < puzzlesToAssess.length) {
      console.log(`   ⏳ Waiting ${delay}ms before next request...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);

    results.push({
      date: puzzle.date,
      theme: puzzle.theme,
      error: error.message,
      success: false,
    });

    failed++;

    // Check if it's a rate limit error
    if (error.message.includes('rate_limit') || error.message.includes('429')) {
      console.log(`   ⏸️  Rate limit hit. Waiting 30 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } else {
      // Still wait a bit before continuing
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log();
}

console.log('='.repeat(60));
console.log('📊 ASSESSMENT SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Successful: ${assessed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success rate: ${((assessed / puzzlesToAssess.length) * 100).toFixed(1)}%`);
console.log();

if (!isDryRun && assessed > 0) {
  // Write updated puzzles back to all-puzzles.json
  console.log('💾 Updating all-puzzles.json...');

  // Create backup
  const backupPath = allPuzzlesPath.replace('.json', `.backup.${Date.now()}.json`);
  fs.copyFileSync(allPuzzlesPath, backupPath);
  console.log(`   ✅ Backup created: ${path.basename(backupPath)}`);

  // Write updated data
  fs.writeFileSync(allPuzzlesPath, JSON.stringify(allPuzzlesData, null, 2), 'utf8');
  console.log('   ✅ all-puzzles.json updated');
  console.log();

  // Export results to CSV for review
  const csvPath = path.join(__dirname, '..', `difficulty-assessment-${Date.now()}.csv`);
  const csvContent = [
    'Date,Theme,Rating,Success,Error',
    ...results.map((r) => `${r.date},"${r.theme}",${r.rating || ''},${r.success},${r.error || ''}`),
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`📄 Results exported to: ${path.basename(csvPath)}`);
}

console.log();
console.log('🎉 Assessment complete!');

if (failed > 0) {
  console.log();
  console.log('⚠️  Some puzzles failed to assess. You can:');
  console.log('   1. Review the errors above');
  console.log('   2. Re-run the script for failed puzzles');
  console.log('   3. Manually assess failed puzzles in the admin panel');
}
