/* eslint-disable no-console */
/**
 * Final quality test - Generate multiple puzzles and show quality metrics
 */

import { buildTrieFromFiles } from '../src/lib/server/TrieGenerator.js';
import CrosswordGenerator from '../src/lib/server/CrosswordGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAndTest(trie, difficulty, minFreq) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${difficulty.toUpperCase()} Difficulty (minFreq: ${minFreq})`);
  console.log('='.repeat(60));

  const generator = new CrosswordGenerator(trie, {
    maxRetries: 30,
    minFrequency: minFreq,
  });

  try {
    const result = generator.generate('scratch', null, 'rotational');

    console.log(`✓ SUCCESS in ${result.stats.totalAttempts} attempts (${result.stats.elapsedTime}ms)`);
    console.log(`\nQuality Metrics:`);
    console.log(`  Score: ${result.stats.qualityScore}`);
    console.log(`  2-letter words: ${result.stats.twoLetterWords}`);
    console.log(`  3-letter words: ${result.stats.threeLetterWords}`);
    console.log(`  4+ letter words: ${result.stats.fourPlusWords}`);

    // Count black squares
    let blacks = 0;
    result.grid.forEach(row => row.forEach(cell => { if (cell === '■') blacks++; }));
    console.log(`  Black squares: ${blacks} (${(blacks/25*100).toFixed(1)}% of grid)`);

    console.log(`\nGrid:`);
    result.solution.forEach(row => console.log('  ' + row.join(' ')));

    console.log(`\nWords:`);
    result.words.forEach(w => console.log(`  ${w.direction}: ${w.word}`));

    return { success: true, stats: result.stats };
  } catch (error) {
    console.log(`✗ FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       ENHANCED CROSSWORD QUALITY TEST SUITE         ║');
  console.log('║     Testing Pattern Quality & Word Selection        ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  console.log('\nLoading word lists...');
  const databasePath = path.join(__dirname, '..', 'database');
  const trie = await buildTrieFromFiles(databasePath, true);
  console.log(`✓ Loaded ${trie.getStats().totalWords} words\n`);

  const tests = [
    { difficulty: 'easy', minFreq: 40 },
    { difficulty: 'medium', minFreq: 25 },
    { difficulty: 'hard', minFreq: 10 },
    { difficulty: 'expert', minFreq: 0 },
  ];

  const results = [];

  for (const test of tests) {
    const result = await generateAndTest(trie, test.difficulty, test.minFreq);
    results.push({ ...test, ...result });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n\n╔══════════════════════════════════════════════════════╗');
  console.log('║                   SUMMARY                            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const successful = results.filter(r => r.success);
  console.log(`Success Rate: ${successful.length}/${results.length} (${(successful.length/results.length*100).toFixed(0)}%)`);

  if (successful.length > 0) {
    console.log('\nQuality Averages:');
    const avgQuality = successful.reduce((sum, r) => sum + r.stats.qualityScore, 0) / successful.length;
    const avg2Letter = successful.reduce((sum, r) => sum + r.stats.twoLetterWords, 0) / successful.length;
    const avg3Letter = successful.reduce((sum, r) => sum + r.stats.threeLetterWords, 0) / successful.length;
    const avg4Plus = successful.reduce((sum, r) => sum + r.stats.fourPlusWords, 0) / successful.length;

    console.log(`  Quality Score: ${avgQuality.toFixed(1)}`);
    console.log(`  2-letter words: ${avg2Letter.toFixed(1)}`);
    console.log(`  3-letter words: ${avg3Letter.toFixed(1)}`);
    console.log(`  4+ letter words: ${avg4Plus.toFixed(1)}`);
  }

  console.log('\n✓ Quality test complete!\n');
}

main();
