#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Convert Infinite Snake Import Files to consolidated format
 *
 * This script reads the Infinite Snake data files (elements.json, emojis.json, combinations.json)
 * and converts them into a consolidated format for import into the import_elements and
 * import_combinations tables.
 *
 * Usage: node scripts/convert-infinite-snake-data.js
 *
 * Output: database/import_data.json containing:
 * - elements: Array of { id, name, emoji }
 * - combinations: Array of { element_a, element_b, result, element_a_id, element_b_id, result_id }
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../database/Infinite Snake Import Files');
const OUTPUT_FILE = path.join(__dirname, '../database/import_data.json');

async function convertData() {
  console.log('Reading input files...');

  // Read the source files
  const elementsRaw = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'elements.json'), 'utf8'));
  const emojisRaw = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, 'emojis.json'), 'utf8'));
  const combinationsRaw = JSON.parse(
    fs.readFileSync(path.join(INPUT_DIR, 'combinations.json'), 'utf8')
  );

  console.log(`Found ${elementsRaw.length} elements`);
  console.log(`Found ${Object.keys(emojisRaw).length} emoji mappings`);
  console.log(`Found ${Object.keys(combinationsRaw).length} combinations`);

  // Build element lookup map: index -> { name, emoji }
  const elementMap = new Map();

  for (const element of elementsRaw) {
    const emoji = emojisRaw[String(element.e)] || '✨';
    elementMap.set(element.i, {
      id: element.i,
      name: element.n,
      emoji: emoji,
      tier: element.t,
    });
  }

  console.log(`Built element map with ${elementMap.size} entries`);

  // Convert elements to array
  const elements = Array.from(elementMap.values()).map(({ id, name, emoji }) => ({
    id,
    name,
    emoji,
  }));

  // Convert combinations
  const combinations = [];
  const skippedCombinations = [];

  for (const [key, resultId] of Object.entries(combinationsRaw)) {
    const [aId, bId] = key.split('+').map(Number);

    const elementA = elementMap.get(aId);
    const elementB = elementMap.get(bId);
    const resultElement = elementMap.get(resultId);

    if (!elementA || !elementB || !resultElement) {
      skippedCombinations.push({
        key,
        resultId,
        reason: `Missing element: A=${!!elementA}, B=${!!elementB}, Result=${!!resultElement}`,
      });
      continue;
    }

    combinations.push({
      element_a: elementA.name,
      element_a_emoji: elementA.emoji,
      element_a_id: aId,
      element_b: elementB.name,
      element_b_emoji: elementB.emoji,
      element_b_id: bId,
      result: resultElement.name,
      result_emoji: resultElement.emoji,
      result_id: resultId,
    });
  }

  console.log(`Converted ${combinations.length} valid combinations`);
  if (skippedCombinations.length > 0) {
    console.log(`Skipped ${skippedCombinations.length} combinations due to missing elements`);
  }

  // Build unique element list from combinations (elements that are actually used)
  const usedElementIds = new Set();
  for (const combo of combinations) {
    usedElementIds.add(combo.element_a_id);
    usedElementIds.add(combo.element_b_id);
    usedElementIds.add(combo.result_id);
  }

  const usedElements = elements.filter((el) => usedElementIds.has(el.id));
  console.log(`${usedElements.length} elements are used in combinations`);

  // Write output
  const output = {
    metadata: {
      generated_at: new Date().toISOString(),
      source: 'Infinite Snake Import Files',
      element_count: usedElements.length,
      combination_count: combinations.length,
      skipped_combinations: skippedCombinations.length,
    },
    elements: usedElements,
    combinations: combinations.map(({ element_a, element_b, result, result_emoji }) => ({
      element_a,
      element_b,
      result,
      result_emoji,
    })),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);

  // Print stats
  console.log('\n=== Summary ===');
  console.log(`Elements: ${output.elements.length}`);
  console.log(`Combinations: ${output.combinations.length}`);

  // Show sample data
  console.log('\n=== Sample Elements ===');
  output.elements.slice(0, 5).forEach((el) => {
    console.log(`  ${el.emoji} ${el.name}`);
  });

  console.log('\n=== Sample Combinations ===');
  output.combinations.slice(0, 5).forEach((combo) => {
    console.log(
      `  ${combo.element_a} + ${combo.element_b} = ${combo.result} ${combo.result_emoji}`
    );
  });
}

convertData().catch(console.error);
