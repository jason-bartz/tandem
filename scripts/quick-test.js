/* eslint-disable no-console */
/**
 * Quick test of enhanced generator
 */

import { buildTrieFromFiles } from '../src/lib/server/TrieGenerator.js';
import CrosswordGenerator from '../src/lib/server/CrosswordGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Loading word lists...');
  const databasePath = path.join(__dirname, '..', 'database');
  const trie = await buildTrieFromFiles(databasePath, true);
  console.log(`Loaded ${trie.getStats().totalWords} words\n`);

  console.log('Testing MEDIUM difficulty (minFreq: 40)...');
  const generator = new CrosswordGenerator(trie, {
    maxRetries: 10,
    minFrequency: 40,
  });

  try {
    const result = generator.generate('scratch', null, 'rotational');
    console.log('\n✓ SUCCESS!');
    console.log(`Words: ${result.words.length}`);
    console.log(`Time: ${result.stats.elapsedTime}ms`);
    console.log(`Quality Score: ${result.stats.qualityScore}`);
    console.log(`2-letter words: ${result.stats.twoLetterWords}`);
    console.log(`3-letter words: ${result.stats.threeLetterWords}`);
    console.log(`4+ letter words: ${result.stats.fourPlusWords}`);
    console.log(`\nGrid:`);
    result.solution.forEach(row => console.log(row.join(' ')));
  } catch (error) {
    console.log('\n✗ FAILED:', error.message);
  }
}

main();
