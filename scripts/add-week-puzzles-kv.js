// This script adds puzzles directly to the file system as JSON
// Since we don't have database credentials, we'll create a JSON file
const fs = require('fs');
const path = require('path');

const puzzles = [
  {
    date: '2025-08-21',
    emojiPair: '🌊🏄',
    words: ['SURF', 'BOARD', 'WAVE', 'RIDER'],
    correctPairs: {
      'SURF': 'BOARD',
      'BOARD': 'SURF',
      'WAVE': 'RIDER',
      'RIDER': 'WAVE'
    }
  },
  {
    date: '2025-08-22',
    emojiPair: '🎭🎬',
    words: ['MOVIE', 'STAR', 'DRAMA', 'QUEEN'],
    correctPairs: {
      'MOVIE': 'STAR',
      'STAR': 'MOVIE',
      'DRAMA': 'QUEEN',
      'QUEEN': 'DRAMA'
    }
  },
  {
    date: '2025-08-23',
    emojiPair: '🏖️☀️',
    words: ['BEACH', 'DAY', 'SUN', 'SHINE'],
    correctPairs: {
      'BEACH': 'DAY',
      'DAY': 'BEACH',
      'SUN': 'SHINE',
      'SHINE': 'SUN'
    }
  },
  {
    date: '2025-08-24',
    emojiPair: '🎮🕹️',
    words: ['VIDEO', 'GAME', 'ARCADE', 'PLAYER'],
    correctPairs: {
      'VIDEO': 'GAME',
      'GAME': 'VIDEO',
      'ARCADE': 'PLAYER',
      'PLAYER': 'ARCADE'
    }
  },
  {
    date: '2025-08-25',
    emojiPair: '📚🔖',
    words: ['BOOK', 'MARK', 'PAGE', 'TURNER'],
    correctPairs: {
      'BOOK': 'MARK',
      'MARK': 'BOOK',
      'PAGE': 'TURNER',
      'TURNER': 'PAGE'
    }
  },
  {
    date: '2025-08-26',
    emojiPair: '🍕🧀',
    words: ['PIZZA', 'PIE', 'CHEESE', 'CAKE'],
    correctPairs: {
      'PIZZA': 'PIE',
      'PIE': 'PIZZA',
      'CHEESE': 'CAKE',
      'CAKE': 'CHEESE'
    }
  },
  {
    date: '2025-08-27',
    emojiPair: '🚀🌟',
    words: ['ROCKET', 'SHIP', 'STAR', 'LIGHT'],
    correctPairs: {
      'ROCKET': 'SHIP',
      'SHIP': 'ROCKET',
      'STAR': 'LIGHT',
      'LIGHT': 'STAR'
    }
  }
];

// Create puzzles directory if it doesn't exist
const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
if (!fs.existsSync(puzzlesDir)) {
  fs.mkdirSync(puzzlesDir, { recursive: true });
}

// Save puzzles as a JSON file
const puzzlesFile = path.join(puzzlesDir, 'week-puzzles.json');
const puzzleData = {
  puzzles: puzzles.map(p => ({
    ...p,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })),
  metadata: {
    createdAt: new Date().toISOString(),
    totalPuzzles: puzzles.length
  }
};

fs.writeFileSync(puzzlesFile, JSON.stringify(puzzleData, null, 2));

console.log('✅ Successfully created puzzles file!');
console.log(`📁 File location: ${puzzlesFile}`);
console.log('\n📅 Puzzles for the week:');
for (const puzzle of puzzles) {
  console.log(`${puzzle.date}: ${puzzle.emojiPair} - ${puzzle.words.join(', ')}`);
}

// Also create individual puzzle files for easier access
puzzles.forEach(puzzle => {
  const fileName = path.join(puzzlesDir, `${puzzle.date}.json`);
  fs.writeFileSync(fileName, JSON.stringify({
    ...puzzle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, null, 2));
});

console.log('\n✅ Created individual puzzle files for each date!');