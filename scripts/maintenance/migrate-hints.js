#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Migration Script: Add Hints to Existing Puzzles
 *
 * This script helps migrate existing puzzles to include hint fields.
 * It can be run in different modes:
 * - Check mode: Lists all puzzles without hints
 * - Generate mode: Uses AI to generate hints for puzzles
 * - Import mode: Imports hints from a CSV file
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Load all puzzles from the all-puzzles.json file
function loadAllPuzzles() {
  const puzzlesPath = path.join(__dirname, '..', 'public', 'puzzles', 'all-puzzles.json');

  if (!fs.existsSync(puzzlesPath)) {
    console.error(`${colors.red}Error: all-puzzles.json not found at ${puzzlesPath}${colors.reset}`);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(puzzlesPath, 'utf8'));
  return data.puzzles || [];
}

// Save puzzles back to all-puzzles.json
function saveAllPuzzles(puzzles) {
  const puzzlesPath = path.join(__dirname, '..', 'public', 'puzzles', 'all-puzzles.json');
  const data = { puzzles };

  // Create backup
  const backupPath = puzzlesPath.replace('.json', `-backup-${Date.now()}.json`);
  if (fs.existsSync(puzzlesPath)) {
    fs.copyFileSync(puzzlesPath, backupPath);
    console.log(`${colors.green}✓ Created backup at ${backupPath}${colors.reset}`);
  }

  fs.writeFileSync(puzzlesPath, JSON.stringify(data, null, 2));
  console.log(`${colors.green}✓ Saved updated puzzles to ${puzzlesPath}${colors.reset}`);
}

// Check which puzzles are missing hints
function checkPuzzlesForHints(puzzles) {
  const missingHints = [];
  const hasHints = [];

  puzzles.forEach((puzzle, index) => {
    const puzzleHasMissingHints = puzzle.puzzles.some(p => !p.hint || p.hint === '');

    if (puzzleHasMissingHints) {
      missingHints.push({
        index,
        date: puzzle.date,
        theme: puzzle.theme,
        missingCount: puzzle.puzzles.filter(p => !p.hint || p.hint === '').length
      });
    } else {
      hasHints.push(puzzle.date);
    }
  });

  console.log(`\n${colors.bright}=== Hint Migration Status ===${colors.reset}`);
  console.log(`${colors.green}✓ Puzzles with hints: ${hasHints.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Puzzles missing hints: ${missingHints.length}${colors.reset}`);

  if (missingHints.length > 0) {
    console.log(`\n${colors.bright}Puzzles missing hints:${colors.reset}`);
    missingHints.slice(0, 10).forEach(p => {
      console.log(`  ${colors.cyan}${p.date}${colors.reset} - ${p.theme} (${p.missingCount} missing)`);
    });

    if (missingHints.length > 10) {
      console.log(`  ... and ${missingHints.length - 10} more`);
    }
  }

  return missingHints;
}

// Generate a basic hint based on the answer (fallback)
function generateBasicHint(answer, theme) {
  // This is a simple fallback - ideally use AI or manual entry
  const words = answer.toLowerCase().split(/\s+/);

  // Try to create a hint based on the theme and answer structure
  if (theme.toLowerCase().includes('food') || theme.toLowerCase().includes('kitchen')) {
    return `${words.length > 1 ? 'Type of' : 'A'} kitchen item`;
  } else if (theme.toLowerCase().includes('animal')) {
    return `${words.length > 1 ? 'Type of' : 'An'} animal`;
  } else if (theme.toLowerCase().includes('sport')) {
    return `Sports-related term`;
  } else if (words.length > 1) {
    return `${words.length}-word phrase`;
  } else {
    return `Related to ${theme.toLowerCase()}`;
  }
}

// Add placeholder hints to puzzles missing them
function addPlaceholderHints(puzzles) {
  let updatedCount = 0;

  puzzles.forEach((puzzle) => {
    puzzle.puzzles.forEach((p) => {
      if (!p.hint || p.hint === '') {
        // Generate a basic hint
        const answer = p.answer.includes(',') ? p.answer.split(',')[0].trim() : p.answer;
        p.hint = generateBasicHint(answer, puzzle.theme);
        updatedCount++;
      }
    });
  });

  console.log(`${colors.green}✓ Added ${updatedCount} placeholder hints${colors.reset}`);
  return puzzles;
}

// Import hints from CSV file
async function importHintsFromCSV(puzzles, csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`${colors.red}Error: CSV file not found at ${csvPath}${colors.reset}`);
    return puzzles;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Expected format: date,puzzle_index,hint
  const hints = {};
  lines.slice(1).forEach(line => { // Skip header
    const [date, index, hint] = line.split(',').map(s => s.trim());
    if (!hints[date]) hints[date] = {};
    hints[date][index] = hint.replace(/^"|"$/g, ''); // Remove quotes
  });

  let updatedCount = 0;
  puzzles.forEach(puzzle => {
    if (hints[puzzle.date]) {
      Object.keys(hints[puzzle.date]).forEach(index => {
        const idx = parseInt(index);
        if (puzzle.puzzles[idx]) {
          puzzle.puzzles[idx].hint = hints[puzzle.date][index];
          updatedCount++;
        }
      });
    }
  });

  console.log(`${colors.green}✓ Imported ${updatedCount} hints from CSV${colors.reset}`);
  return puzzles;
}

// Export puzzles without hints to CSV for manual editing
function exportMissingHintsToCSV(puzzles, outputPath) {
  const csvLines = ['date,puzzle_index,emoji,answer,hint'];

  puzzles.forEach(puzzle => {
    puzzle.puzzles.forEach((p, index) => {
      if (!p.hint || p.hint === '') {
        csvLines.push(`${puzzle.date},${index},"${p.emoji}","${p.answer}",""`);
      }
    });
  });

  fs.writeFileSync(outputPath, csvLines.join('\n'));
  console.log(`${colors.green}✓ Exported missing hints to ${outputPath}${colors.reset}`);
  console.log(`${colors.cyan}Edit this file to add hints, then run: npm run migrate:hints import ${outputPath}${colors.reset}`);
}

// Interactive mode to add hints manually
async function interactiveHintEntry(puzzles) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log(`\n${colors.bright}=== Interactive Hint Entry ===${colors.reset}`);
  console.log('Enter hints for puzzles (press Enter to skip, type "quit" to exit)\n');

  for (const puzzle of puzzles) {
    let hasChanges = false;

    for (let i = 0; i < puzzle.puzzles.length; i++) {
      const p = puzzle.puzzles[i];
      if (!p.hint || p.hint === '') {
        console.log(`\n${colors.cyan}Date: ${puzzle.date} | Theme: ${puzzle.theme}${colors.reset}`);
        console.log(`Puzzle ${i + 1}: ${p.emoji} = ${p.answer}`);

        const hint = await question('Enter hint (max 60 chars): ');

        if (hint.toLowerCase() === 'quit') {
          rl.close();
          return puzzles;
        }

        if (hint && hint.trim()) {
          p.hint = hint.trim().slice(0, 60);
          hasChanges = true;
          console.log(`${colors.green}✓ Hint added${colors.reset}`);
        }
      }
    }

    if (hasChanges) {
      const save = await question('Save changes for this puzzle? (y/n): ');
      if (save.toLowerCase() !== 'y') {
        console.log(`${colors.yellow}Changes discarded${colors.reset}`);
      }
    }
  }

  rl.close();
  return puzzles;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  console.log(`${colors.bright}Tandem Puzzle Hint Migration Tool${colors.reset}`);
  console.log('================================\n');

  // Load all puzzles
  const puzzles = loadAllPuzzles();
  if (!puzzles) {
    process.exit(1);
  }

  console.log(`Loaded ${puzzles.length} puzzles\n`);

  switch (command) {
    case 'check':
      // Just check and report status
      checkPuzzlesForHints(puzzles);
      break;

    case 'generate':
      // Add placeholder hints to all missing
      const missingHints = checkPuzzlesForHints(puzzles);
      if (missingHints.length > 0) {
        const updated = addPlaceholderHints(puzzles);
        saveAllPuzzles(updated);
      } else {
        console.log(`${colors.green}All puzzles already have hints!${colors.reset}`);
      }
      break;

    case 'export':
      // Export missing hints to CSV
      const outputPath = args[1] || 'missing-hints.csv';
      exportMissingHintsToCSV(puzzles, outputPath);
      break;

    case 'import':
      // Import hints from CSV
      const csvPath = args[1];
      if (!csvPath) {
        console.error(`${colors.red}Error: Please provide CSV file path${colors.reset}`);
        console.log('Usage: npm run migrate:hints import <csv-file>');
        process.exit(1);
      }
      const importedPuzzles = await importHintsFromCSV(puzzles, csvPath);
      saveAllPuzzles(importedPuzzles);
      break;

    case 'interactive':
      // Interactive mode
      const interactivePuzzles = puzzles.filter(p =>
        p.puzzles.some(puzzle => !puzzle.hint || puzzle.hint === '')
      );

      if (interactivePuzzles.length === 0) {
        console.log(`${colors.green}All puzzles already have hints!${colors.reset}`);
      } else {
        await interactiveHintEntry(interactivePuzzles.slice(0, 5)); // Limit to 5 for testing
        saveAllPuzzles(puzzles);
      }
      break;

    default:
      console.log(`${colors.yellow}Unknown command: ${command}${colors.reset}\n`);
      console.log('Available commands:');
      console.log('  check       - Check which puzzles are missing hints');
      console.log('  generate    - Generate placeholder hints for missing ones');
      console.log('  export      - Export missing hints to CSV for manual editing');
      console.log('  import      - Import hints from CSV file');
      console.log('  interactive - Add hints interactively');
      break;
  }
}

// Run the migration
main().catch(console.error);