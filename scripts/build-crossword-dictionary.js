#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Build Crossword Master Dictionary
 *
 * Merges all word list source files into a single master .dict file
 * containing only 2-5 letter words with scores, suitable for the
 * crossword generator's WordIndex.
 *
 * Format: WORD;SCORE (one per line, uppercase A-Z only, score 1-100)
 *
 * Usage: node scripts/build-crossword-dictionary.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'database', 'new-crossword-generator', 'word-lists');
const OUTPUT_FILE = path.join(__dirname, '..', 'database', 'crossword-master.dict');

// Only keep words of these lengths
const MIN_LENGTH = 2;
const MAX_LENGTH = 5;

// Only allow A-Z characters
const VALID_WORD_RE = /^[A-Z]+$/;

// Source files and their format quirks
const SOURCE_FILES = [
  // Primary lists (large, comprehensive, already scored)
  {
    file: 'xwordlist.dict.txt',
    priority: 1,
    description: 'XWord Info master list (~568K entries)',
  },
  {
    file: 'Broda List 03.2020 trimmed by Diehl.TXT',
    priority: 2,
    description: 'Broda/Diehl curated list (~279K entries)',
  },
  {
    file: 'spreadthewordlist.txt',
    priority: 3,
    description: 'Spread The Wordlist (~311K entries)',
  },
  {
    file: 'crossword_wordlist.txt',
    priority: 4,
    description: 'Chris Jones crossword wordlist (~176K entries)',
  },

  // Supplementary themed lists (small, specialized)
  { file: 'tech.dict', priority: 5, description: 'Tech terms (~1.8K entries)' },
  { file: 'celebs-scored.dict', priority: 5, description: 'Celebrity names (~2K entries)' },
  {
    file: 'urbandictionary-scored.dict',
    priority: 5,
    description: 'Urban dictionary terms (~1.3K entries)',
  },
  { file: 'netspeak-scored.dict', priority: 5, description: 'Internet slang (~200 entries)' },
  { file: 'colleges-scored.dict', priority: 5, description: 'College names (~120 entries)' },
  { file: 'websites-scored.dict', priority: 5, description: 'Website names (~285 entries)' },
];

/**
 * Parse a single line from any word list format.
 * Handles: "WORD;SCORE", "word;score", "Word With Spaces;Score"
 * Returns { word, score } or null if invalid.
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const semicolonIdx = trimmed.lastIndexOf(';');
  if (semicolonIdx === -1) return null;

  const rawWord = trimmed.substring(0, semicolonIdx);
  const rawScore = trimmed.substring(semicolonIdx + 1);

  // Parse score
  const score = parseInt(rawScore, 10);
  if (isNaN(score) || score < 1 || score > 100) return null;

  // Normalize word: strip spaces/hyphens/apostrophes, uppercase
  const word = rawWord.replace(/[\s\-''.]/g, '').toUpperCase();

  // Validate: only A-Z
  if (!VALID_WORD_RE.test(word)) return null;

  // Filter by length
  if (word.length < MIN_LENGTH || word.length > MAX_LENGTH) return null;

  return { word, score };
}

/**
 * Load and parse a source file.
 * Returns Map<word, score>.
 */
function loadSourceFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const words = new Map();

  let parsed = 0;
  let skipped = 0;

  for (const line of lines) {
    const result = parseLine(line);
    if (result) {
      // Within a single file, keep the higher score if duplicates exist
      const existing = words.get(result.word);
      if (!existing || result.score > existing) {
        words.set(result.word, result.score);
      }
      parsed++;
    } else if (line.trim()) {
      skipped++;
    }
  }

  return { words, parsed, skipped };
}

/**
 * Merge strategy: for each word, keep the highest score across all sources.
 */
function mergeWordLists() {
  const master = new Map(); // word → score
  const sourceStats = [];

  console.log('=== Building Crossword Master Dictionary ===\n');
  console.log(`Filtering to ${MIN_LENGTH}-${MAX_LENGTH} letter words, A-Z only\n`);

  for (const source of SOURCE_FILES) {
    const filePath = path.join(SOURCE_DIR, source.file);

    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${source.file} (file not found)`);
      sourceStats.push({ ...source, status: 'not found', contributed: 0 });
      continue;
    }

    const { words, parsed, skipped } = loadSourceFile(filePath);

    let newWords = 0;
    let upgradedScores = 0;
    let keptExisting = 0;

    for (const [word, score] of words) {
      const existingScore = master.get(word);
      if (existingScore === undefined) {
        master.set(word, score);
        newWords++;
      } else if (score > existingScore) {
        master.set(word, score);
        upgradedScores++;
      } else {
        keptExisting++;
      }
    }

    const stat = {
      ...source,
      status: 'loaded',
      totalParsed: parsed,
      skipped,
      qualifyingWords: words.size,
      newWords,
      upgradedScores,
      keptExisting,
    };
    sourceStats.push(stat);

    console.log(`  ${source.file}`);
    console.log(`    ${source.description}`);
    console.log(
      `    Parsed: ${parsed.toLocaleString()} | Qualifying (${MIN_LENGTH}-${MAX_LENGTH} letter): ${words.size.toLocaleString()}`
    );
    console.log(
      `    New words added: ${newWords.toLocaleString()} | Score upgrades: ${upgradedScores.toLocaleString()} | Kept existing: ${keptExisting.toLocaleString()}`
    );
    if (skipped > 0) console.log(`    Skipped (invalid format): ${skipped.toLocaleString()}`);
    console.log();
  }

  return { master, sourceStats };
}

/**
 * Write the master dictionary file.
 */
function writeMasterDict(master) {
  // Sort: by length (ascending), then alphabetically within each length
  const entries = Array.from(master.entries());
  entries.sort((a, b) => {
    if (a[0].length !== b[0].length) return a[0].length - b[0].length;
    return a[0].localeCompare(b[0]);
  });

  const header = [
    '# Crossword Master Dictionary',
    `# Generated: ${new Date().toISOString().split('T')[0]}`,
    `# Format: WORD;SCORE (1-100)`,
    `# Words: ${entries.length.toLocaleString()} (lengths ${MIN_LENGTH}-${MAX_LENGTH})`,
    '#',
    `# Sources: ${SOURCE_FILES.map((s) => s.file).join(', ')}`,
    '#',
    '# Merge strategy: highest score wins across all sources',
    '# To regenerate: node scripts/build-crossword-dictionary.js',
    '#',
  ];

  const lines = [...header, ...entries.map(([word, score]) => `${word};${score}`)];

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf-8');

  return entries;
}

/**
 * Print detailed statistics about the master dictionary.
 */
function printStats(entries) {
  console.log('=== Master Dictionary Statistics ===\n');
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Total words: ${entries.length.toLocaleString()}\n`);

  // By length
  const byLength = {};
  for (const [word] of entries) {
    const len = word.length;
    byLength[len] = (byLength[len] || 0) + 1;
  }

  console.log('Words by length:');
  for (let len = MIN_LENGTH; len <= MAX_LENGTH; len++) {
    const count = byLength[len] || 0;
    console.log(`  ${len}-letter: ${count.toLocaleString()}`);
  }
  console.log();

  // Score distribution
  const scoreBuckets = { '1-10': 0, '11-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
  for (const [, score] of entries) {
    if (score <= 10) scoreBuckets['1-10']++;
    else if (score <= 25) scoreBuckets['11-25']++;
    else if (score <= 50) scoreBuckets['26-50']++;
    else if (score <= 75) scoreBuckets['51-75']++;
    else scoreBuckets['76-100']++;
  }

  console.log('Score distribution:');
  for (const [range, count] of Object.entries(scoreBuckets)) {
    const pct = ((count / entries.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(
      `  ${range.padEnd(7)}: ${count.toLocaleString().padStart(8)} (${pct.padStart(5)}%) ${bar}`
    );
  }
  console.log();

  // Sample high-scoring words by length
  console.log('Sample high-scoring words (score >= 75):');
  for (let len = MIN_LENGTH; len <= MAX_LENGTH; len++) {
    const highScoring = entries
      .filter(([w, s]) => w.length === len && s >= 75)
      .slice(0, 10)
      .map(([w, s]) => `${w}(${s})`);
    console.log(`  ${len}-letter: ${highScoring.join(', ')}`);
  }
  console.log();

  // File size
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`File size: ${sizeMB} MB`);
}

// === Main ===
function main() {
  const startTime = Date.now();

  const { master } = mergeWordLists();
  const entries = writeMasterDict(master);
  printStats(entries);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nCompleted in ${elapsed}s`);
}

main();
