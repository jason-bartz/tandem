/**
 * Migration script to fix HTML-encoded hints in existing puzzles
 *
 * This script decodes HTML entities (like &#x27; for apostrophes) in hints
 * that were incorrectly encoded during save operations.
 *
 * Run with: node scripts/fix-hint-encoding.js
 */

const fs = require('fs');
const path = require('path');

// HTML entity decoding function
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text;

  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };

  return text.replace(
    /&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g,
    (entity) => entities[entity] || entity
  );
}

// Process a single puzzle file
function fixPuzzleFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Fix theme if it contains encoded entities
    if (data.theme && data.theme.includes('&#x27;')) {
      data.theme = decodeHtmlEntities(data.theme);
      modified = true;
    }

    // Fix hints in puzzles
    if (data.puzzles && Array.isArray(data.puzzles)) {
      data.puzzles.forEach((puzzle) => {
        if (puzzle.hint && puzzle.hint.includes('&#x27;')) {
          puzzle.hint = decodeHtmlEntities(puzzle.hint);
          modified = true;
        }
      });
    }

    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('Starting hint encoding fix...\n');

  const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
  let totalFiles = 0;
  let fixedFiles = 0;

  // Check if puzzles directory exists
  if (!fs.existsSync(puzzlesDir)) {
    console.log('Puzzles directory does not exist. Nothing to fix.');
    return;
  }

  // Process all-puzzles.json if it exists
  const allPuzzlesPath = path.join(puzzlesDir, 'all-puzzles.json');
  if (fs.existsSync(allPuzzlesPath)) {
    console.log('Processing all-puzzles.json...');
    try {
      const data = JSON.parse(fs.readFileSync(allPuzzlesPath, 'utf8'));
      let modified = false;

      if (data.puzzles && Array.isArray(data.puzzles)) {
        data.puzzles.forEach((puzzleEntry) => {
          // Fix theme
          if (puzzleEntry.theme && puzzleEntry.theme.includes('&#x27;')) {
            puzzleEntry.theme = decodeHtmlEntities(puzzleEntry.theme);
            modified = true;
          }

          // Fix hints
          if (puzzleEntry.puzzles && Array.isArray(puzzleEntry.puzzles)) {
            puzzleEntry.puzzles.forEach((puzzle) => {
              if (puzzle.hint && puzzle.hint.includes('&#x27;')) {
                puzzle.hint = decodeHtmlEntities(puzzle.hint);
                modified = true;
              }
            });
          }
        });
      }

      if (modified) {
        fs.writeFileSync(allPuzzlesPath, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ Fixed all-puzzles.json\n');
        fixedFiles++;
      } else {
        console.log('✓ all-puzzles.json - no issues found\n');
      }

      totalFiles++;
    } catch (error) {
      console.error(`Error processing all-puzzles.json:`, error.message);
    }
  }

  // Process individual puzzle JSON files
  const files = fs.readdirSync(puzzlesDir);
  const puzzleFiles = files.filter((file) => file.match(/^\d{4}-\d{2}-\d{2}\.json$/));

  console.log(`Found ${puzzleFiles.length} individual puzzle files`);

  puzzleFiles.forEach((file) => {
    const filePath = path.join(puzzlesDir, file);
    totalFiles++;

    if (fixPuzzleFile(filePath)) {
      console.log(`✅ Fixed ${file}`);
      fixedFiles++;
    }
  });

  console.log(`\n--- Summary ---`);
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files fixed: ${fixedFiles}`);
  console.log(`Files unchanged: ${totalFiles - fixedFiles}`);

  if (fixedFiles > 0) {
    console.log('\n✨ Migration complete! All HTML-encoded hints have been decoded.');
  } else {
    console.log('\n✓ No issues found. All hints are already properly formatted.');
  }
}

// Run the migration
main();
