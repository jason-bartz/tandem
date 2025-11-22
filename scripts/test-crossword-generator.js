/* eslint-disable no-console */
/**
 * Test script for the enhanced crossword generator
 * Tests the new two-level heuristic algorithm with different difficulty levels
 */

import { buildTrieFromFiles } from '../src/lib/server/TrieGenerator.js';
import CrosswordGenerator from '../src/lib/server/CrosswordGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function displayGrid(grid, title = 'Grid') {
  log(`\n${title}:`, 'bright');
  console.log('  ┌───┬───┬───┬───┬───┐');
  for (let row = 0; row < 5; row++) {
    let line = '  │';
    for (let col = 0; col < 5; col++) {
      const cell = grid[row][col];
      const display = cell === '■' ? '█' : (cell || ' ');
      line += ` ${display} │`;
    }
    console.log(line);
    if (row < 4) {
      console.log('  ├───┼───┼───┼───┼───┤');
    }
  }
  console.log('  └───┴───┴───┴───┴───┘');
}

function displayWords(words, title = 'Placed Words') {
  log(`\n${title}:`, 'bright');
  const acrossWords = words.filter(w => w.direction === 'across');
  const downWords = words.filter(w => w.direction === 'down');

  if (acrossWords.length > 0) {
    log('  Across:', 'cyan');
    acrossWords.forEach(w => {
      console.log(`    ${w.word} (${w.startRow},${w.startCol})`);
    });
  }

  if (downWords.length > 0) {
    log('  Down:', 'cyan');
    downWords.forEach(w => {
      console.log(`    ${w.word} (${w.startRow},${w.startCol})`);
    });
  }
}

function displayStats(stats, title = 'Generation Statistics') {
  log(`\n${title}:`, 'bright');
  console.log(`  Time Elapsed:        ${stats.elapsedTime}ms`);
  console.log(`  Total Attempts:      ${stats.totalAttempts}`);
  console.log(`  Backtrack Count:     ${stats.backtrackCount}`);
  console.log(`  Slots Filled:        ${stats.slotsFilled}`);
  console.log(`  Pattern Searches:    ${stats.patternSearches}`);
  console.log(`  Flexibility Calcs:   ${stats.flexibilityCalculations}`);
  console.log(`  Cache Hit Rate:      ${stats.cacheHitRate?.toFixed(2)}%`);
  console.log(`  Cache Size:          ${stats.cacheSize} entries`);
}

async function testGenerator(trie, difficulty, minFrequency) {
  log(`\n${'='.repeat(60)}`, 'yellow');
  log(`Testing: ${difficulty.toUpperCase()} difficulty (minFreq: ${minFrequency})`, 'yellow');
  log('='.repeat(60), 'yellow');

  try {
    const generator = new CrosswordGenerator(trie, {
      maxRetries: 100,
      minFrequency,
    });

    log('\nGenerating puzzle from scratch...', 'blue');
    const result = generator.generate('scratch', null, 'rotational');

    if (result.success) {
      log('✓ Generation successful!', 'green');

      displayGrid(result.grid, 'Pattern (Black Squares)');
      displayGrid(result.solution, 'Solution (Filled Grid)');
      displayWords(result.words);
      displayStats(result.stats);

      return { success: true, result };
    } else {
      log('✗ Generation failed', 'red');
      return { success: false, error: 'Generation returned unsuccessful' };
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║     CROSSWORD GENERATOR ALGORITHM TEST SUITE          ║', 'cyan');
  log('║     Two-Level Heuristic (MCV + LCV) Implementation    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  // Load Trie with frequencies
  log('Loading word lists and frequency data...', 'blue');
  const databasePath = path.join(__dirname, '..', 'database');
  const startLoad = Date.now();
  const trie = await buildTrieFromFiles(databasePath, true);
  const loadTime = Date.now() - startLoad;

  const stats = trie.getStats();
  log(`✓ Trie loaded in ${loadTime}ms`, 'green');
  log(`  Total words: ${stats.totalWords}`, 'cyan');
  log(`  Words with frequency: ${stats.wordsWithFrequency}`, 'cyan');
  log(`  By length: ${JSON.stringify(stats.byLength)}`, 'cyan');

  // Test different difficulty levels
  const testCases = [
    { difficulty: 'easy', minFrequency: 70 },
    { difficulty: 'medium', minFrequency: 40 },
    { difficulty: 'hard', minFrequency: 20 },
    { difficulty: 'expert', minFrequency: 0 },
  ];

  const results = [];

  for (const testCase of testCases) {
    const result = await testGenerator(trie, testCase.difficulty, testCase.minFrequency);
    results.push({ ...testCase, ...result });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TEST SUMMARY                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;

  results.forEach(r => {
    const status = r.success ? colors.green + '✓ PASS' : colors.red + '✗ FAIL';
    const time = r.result?.stats?.elapsedTime || 'N/A';
    const words = r.result?.words?.length || 0;
    console.log(`${status}${colors.reset} - ${r.difficulty.padEnd(8)} (${time}ms, ${words} words)`);
  });

  log(`\nOverall: ${successCount}/${totalTests} tests passed`, successCount === totalTests ? 'green' : 'yellow');

  // Performance comparison
  if (successCount > 0) {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║              PERFORMANCE COMPARISON                    ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

    const successfulResults = results.filter(r => r.success);
    successfulResults.forEach(r => {
      const stats = r.result.stats;
      log(`${r.difficulty.toUpperCase()}:`, 'bright');
      console.log(`  Time: ${stats.elapsedTime}ms | Backtracks: ${stats.backtrackCount} | Cache Hit: ${stats.cacheHitRate?.toFixed(1)}%`);
    });

    const avgTime = successfulResults.reduce((sum, r) => sum + r.result.stats.elapsedTime, 0) / successfulResults.length;
    const avgBacktracks = successfulResults.reduce((sum, r) => sum + r.result.stats.backtrackCount, 0) / successfulResults.length;
    const avgCacheHit = successfulResults.reduce((sum, r) => sum + r.result.stats.cacheHitRate, 0) / successfulResults.length;

    log('\nAverages:', 'yellow');
    console.log(`  Time: ${avgTime.toFixed(0)}ms | Backtracks: ${avgBacktracks.toFixed(1)} | Cache Hit: ${avgCacheHit.toFixed(1)}%`);
  }

  log('\n✓ Test suite complete!\n', 'green');
}

// Run tests
main().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
