const fs = require('fs');
const path = require('path');

// Calculate puzzle number based on date
function getPuzzleNumber(date) {
  const start = new Date('2025-08-16');
  const target = new Date(date);
  const diffTime = target - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

// Get all puzzle files
const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
const files = fs.readdirSync(puzzlesDir);

// Update each puzzle file
files.forEach(file => {
  // Skip non-date files
  if (!file.match(/^\d{4}-\d{2}-\d{2}\.json$/)) {
    return;
  }
  
  const filePath = path.join(puzzlesDir, file);
  const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Update puzzle number
  const date = file.replace('.json', '');
  puzzle.puzzleNumber = getPuzzleNumber(date);
  
  // Save updated puzzle
  fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 2));
  console.log(`Updated ${date}: Puzzle #${puzzle.puzzleNumber} - ${puzzle.theme}`);
});

console.log('\n✅ All puzzle numbers updated!');
console.log('Puzzle #1 starts on August 16, 2025');