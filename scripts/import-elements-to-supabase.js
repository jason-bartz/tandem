#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Import converted Infinite Snake data into Supabase
 *
 * Prerequisites:
 * 1. Run the import_elements_schema.sql in Supabase SQL Editor
 * 2. Run convert-infinite-snake-data.js to generate import_data.json
 *
 * Usage: node scripts/import-elements-to-supabase.js
 *
 * Environment variables required:
 * - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DATA_FILE = path.join(__dirname, '../database/import_data.json');
const BATCH_SIZE = 500;

// Normalize combination key (alphabetically sorted, lowercase)
function normalizeKey(a, b) {
  const lower = [a.toLowerCase().trim(), b.toLowerCase().trim()].sort();
  return `${lower[0]}|${lower[1]}`;
}

async function importData() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Connected to Supabase');

  // Read the converted data
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found: ${DATA_FILE}`);
    console.error('Please run convert-infinite-snake-data.js first');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`\nLoaded data file:`);
  console.log(`  Elements: ${data.elements.length}`);
  console.log(`  Combinations: ${data.combinations.length}`);

  // Check if tables already have data
  const { count: existingElements } = await supabase
    .from('import_elements')
    .select('*', { count: 'exact', head: true });

  const { count: existingCombinations } = await supabase
    .from('import_combinations')
    .select('*', { count: 'exact', head: true });

  if (existingElements > 0 || existingCombinations > 0) {
    console.log(`\nTables already have data:`);
    console.log(`  import_elements: ${existingElements} rows`);
    console.log(`  import_combinations: ${existingCombinations} rows`);
    console.log('\nTo re-import, first truncate the tables in Supabase SQL Editor:');
    console.log('  TRUNCATE import_elements, import_combinations RESTART IDENTITY;');
    process.exit(0);
  }

  // Import elements
  console.log('\n=== Importing Elements ===');
  const elementBatches = [];
  for (let i = 0; i < data.elements.length; i += BATCH_SIZE) {
    elementBatches.push(data.elements.slice(i, i + BATCH_SIZE));
  }

  let importedElements = 0;
  for (let i = 0; i < elementBatches.length; i++) {
    const batch = elementBatches[i].map((el) => ({
      name: el.name,
      emoji: el.emoji,
      original_id: el.id,
    }));

    const { error } = await supabase.from('import_elements').insert(batch);

    if (error) {
      console.error(`Error inserting element batch ${i + 1}:`, error.message);
      // Continue with next batch
    } else {
      importedElements += batch.length;
      process.stdout.write(`\r  Imported ${importedElements}/${data.elements.length} elements`);
    }
  }
  console.log();

  // Import combinations
  console.log('\n=== Importing Combinations ===');
  const combinationBatches = [];
  for (let i = 0; i < data.combinations.length; i += BATCH_SIZE) {
    combinationBatches.push(data.combinations.slice(i, i + BATCH_SIZE));
  }

  let importedCombinations = 0;
  let duplicates = 0;
  for (let i = 0; i < combinationBatches.length; i++) {
    const batch = combinationBatches[i].map((combo) => ({
      combination_key: normalizeKey(combo.element_a, combo.element_b),
      element_a: combo.element_a,
      element_b: combo.element_b,
      result_element: combo.result,
      result_emoji: combo.result_emoji,
    }));

    const { error } = await supabase.from('import_combinations').insert(batch);

    if (error) {
      if (error.code === '23505') {
        // Unique violation - count duplicates
        duplicates += batch.length;
      } else {
        console.error(`\nError inserting combination batch ${i + 1}:`, error.message);
      }
    } else {
      importedCombinations += batch.length;
    }
    process.stdout.write(
      `\r  Imported ${importedCombinations}/${data.combinations.length} combinations`
    );
  }
  console.log();

  if (duplicates > 0) {
    console.log(`  Skipped ${duplicates} duplicate combinations`);
  }

  // Verify import
  console.log('\n=== Verification ===');
  const { count: finalElements } = await supabase
    .from('import_elements')
    .select('*', { count: 'exact', head: true });

  const { count: finalCombinations } = await supabase
    .from('import_combinations')
    .select('*', { count: 'exact', head: true });

  console.log(`  import_elements: ${finalElements} rows`);
  console.log(`  import_combinations: ${finalCombinations} rows`);

  console.log('\n=== Import Complete ===');
}

importData().catch(console.error);
