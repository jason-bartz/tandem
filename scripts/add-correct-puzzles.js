const fs = require('fs');
const path = require('path');

const puzzles = [
  {
    date: '2025-08-21',
    theme: 'Things You Read',
    puzzles: [
      { emoji: '📰🗞️', answer: 'NEWSPAPER' },
      { emoji: '📖📚', answer: 'BOOK' },
      { emoji: '📧💻', answer: 'EMAIL' },
      { emoji: '🗺️🧭', answer: 'MAP' }
    ]
  },
  {
    date: '2025-08-22',
    theme: 'Board Games',
    puzzles: [
      { emoji: '🎲🏠', answer: 'MONOPOLY' },
      { emoji: '♟️👑', answer: 'CHESS' },
      { emoji: '❌⭕', answer: 'CHECKERS' },
      { emoji: '🔤📝', answer: 'SCRABBLE' }
    ]
  },
  {
    date: '2025-08-23',
    theme: 'Things That Fly',
    puzzles: [
      { emoji: '✈️🛫', answer: 'PLANE' },
      { emoji: '🦅🪶', answer: 'BIRD' },
      { emoji: '🚁🔄', answer: 'HELICOPTER' },
      { emoji: '🪁🧵', answer: 'KITE' }
    ]
  },
  {
    date: '2025-08-24',
    theme: 'School Subjects',
    puzzles: [
      { emoji: '🔬🧪', answer: 'SCIENCE' },
      { emoji: '➕➖', answer: 'MATH' },
      { emoji: '🌍🗺️', answer: 'GEOGRAPHY' },
      { emoji: '🎨🖌️', answer: 'ART' }
    ]
  },
  {
    date: '2025-08-25',
    theme: 'Things You Wear',
    puzzles: [
      { emoji: '👓📖', answer: 'GLASSES' },
      { emoji: '⌚⏰', answer: 'WATCH' },
      { emoji: '👔💼', answer: 'TIE' },
      { emoji: '🧤❄️', answer: 'GLOVES' }
    ]
  },
  {
    date: '2025-08-26',
    theme: 'Desserts',
    puzzles: [
      { emoji: '🍦🍨', answer: 'ICECREAM' },
      { emoji: '🍪🥛', answer: 'COOKIE' },
      { emoji: '🥧🍎', answer: 'PIE' },
      { emoji: '🍩☕', answer: 'DONUT' }
    ]
  },
  {
    date: '2025-08-27',
    theme: 'Things at the Beach',
    puzzles: [
      { emoji: '🏖️☂️', answer: 'UMBRELLA' },
      { emoji: '🌊🏄', answer: 'WAVES' },
      { emoji: '🐚🦀', answer: 'SHELLS' },
      { emoji: '🏰👶', answer: 'SANDCASTLE' }
    ]
  },
  {
    date: '2025-08-28',
    theme: 'Musical Instruments',
    puzzles: [
      { emoji: '🎹🎵', answer: 'PIANO' },
      { emoji: '🥁🎶', answer: 'DRUMS' },
      { emoji: '🎸🤘', answer: 'GUITAR' },
      { emoji: '🎺📯', answer: 'TRUMPET' }
    ]
  },
  {
    date: '2025-08-29',
    theme: 'Breakfast Foods',
    puzzles: [
      { emoji: '🥞🍯', answer: 'PANCAKES' },
      { emoji: '🥚🍳', answer: 'EGGS' },
      { emoji: '🥓🐷', answer: 'BACON' },
      { emoji: '🥣🥛', answer: 'CEREAL' }
    ]
  },
  {
    date: '2025-08-30',
    theme: 'Office Supplies',
    puzzles: [
      { emoji: '✏️📝', answer: 'PENCIL' },
      { emoji: '📎📄', answer: 'PAPERCLIP' },
      { emoji: '✂️📰', answer: 'SCISSORS' },
      { emoji: '📌📋', answer: 'PUSHPIN' }
    ]
  }
];

// Create puzzles directory if it doesn't exist
const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
if (!fs.existsSync(puzzlesDir)) {
  fs.mkdirSync(puzzlesDir, { recursive: true });
}

// Save each puzzle with the correct format
puzzles.forEach(puzzle => {
  const fileName = path.join(puzzlesDir, `${puzzle.date}.json`);
  
  // Format for the game (matching the existing structure)
  const formattedPuzzle = {
    date: puzzle.date,
    theme: puzzle.theme,
    emojiPairs: puzzle.puzzles.map(p => p.emoji),
    words: puzzle.puzzles.map(p => p.answer),
    correctAnswers: puzzle.puzzles.map(p => p.answer),
    puzzles: puzzle.puzzles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(fileName, JSON.stringify(formattedPuzzle, null, 2));
  console.log(`✅ Created puzzle for ${puzzle.date}: ${puzzle.theme}`);
});

// Also create a master file with all puzzles
const allPuzzlesFile = path.join(puzzlesDir, 'all-puzzles.json');
fs.writeFileSync(allPuzzlesFile, JSON.stringify({
  puzzles: puzzles.map(puzzle => ({
    date: puzzle.date,
    theme: puzzle.theme,
    emojiPairs: puzzle.puzzles.map(p => p.emoji),
    words: puzzle.puzzles.map(p => p.answer),
    correctAnswers: puzzle.puzzles.map(p => p.answer),
    puzzles: puzzle.puzzles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })),
  metadata: {
    createdAt: new Date().toISOString(),
    totalPuzzles: puzzles.length
  }
}, null, 2));

console.log('\n📅 Puzzles for the next 10 days:');
puzzles.forEach(puzzle => {
  console.log(`${puzzle.date}: ${puzzle.theme}`);
  puzzle.puzzles.forEach(p => {
    console.log(`  ${p.emoji} → ${p.answer}`);
  });
});