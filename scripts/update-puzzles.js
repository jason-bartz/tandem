const fs = require('fs');
const path = require('path');

// Read the existing puzzles
const allPuzzlesPath = path.join(__dirname, '..', 'public', 'puzzles', 'all-puzzles.json');
const allPuzzles = JSON.parse(fs.readFileSync(allPuzzlesPath, 'utf8'));

// New puzzles to add/replace
const newPuzzles = [
  {
    date: '2025-08-23',
    theme: 'Things That Erode',
    emojiPairs: ['🏖️🌊', '🤝💔', '⛰️💨', '💵📉'],
    words: ['BEACH', 'TRUST', 'MOUNTAIN', 'VALUE'],
    correctAnswers: ['BEACH', 'TRUST', 'MOUNTAIN', 'VALUE'],
    puzzles: [
      { emoji: '🏖️🌊', answer: 'BEACH' },
      { emoji: '🤝💔', answer: 'TRUST' },
      { emoji: '⛰️💨', answer: 'MOUNTAIN' },
      { emoji: '💵📉', answer: 'VALUE' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    date: '2025-08-24',
    theme: 'Types of Anchors',
    emojiPairs: ['⚓🚢', '📺📰', '👨‍👩‍👧💕', '🏃🏁'],
    words: ['SHIP', 'NEWS', 'FAMILY', 'RELAY'],
    correctAnswers: ['SHIP', 'NEWS', 'FAMILY', 'RELAY'],
    puzzles: [
      { emoji: '⚓🚢', answer: 'SHIP' },
      { emoji: '📺📰', answer: 'NEWS' },
      { emoji: '👨‍👩‍👧💕', answer: 'FAMILY' },
      { emoji: '🏃🏁', answer: 'RELAY' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    date: '2025-08-25',
    theme: 'Forms of Resistance',
    emojiPairs: ['💨🏢', '💪🦠', '✊📢', '💧🧥'],
    words: ['WIND', 'IMMUNE', 'PROTEST', 'WATER'],
    correctAnswers: ['WIND', 'IMMUNE', 'PROTEST', 'WATER'],
    puzzles: [
      { emoji: '💨🏢', answer: 'WIND' },
      { emoji: '💪🦠', answer: 'IMMUNE' },
      { emoji: '✊📢', answer: 'PROTEST' },
      { emoji: '💧🧥', answer: 'WATER' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    date: '2025-08-26',
    theme: 'Types of Signatures',
    emojiPairs: ['✍️📄', '🎵🎶', '👃🌹', '🔬🧬'],
    words: ['WRITTEN', 'MUSICAL', 'SCENT', 'GENETIC'],
    correctAnswers: ['WRITTEN', 'MUSICAL', 'SCENT', 'GENETIC'],
    puzzles: [
      { emoji: '✍️📄', answer: 'WRITTEN' },
      { emoji: '🎵🎶', answer: 'MUSICAL' },
      { emoji: '👃🌹', answer: 'SCENT' },
      { emoji: '🔬🧬', answer: 'GENETIC' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    date: '2025-08-27',
    theme: 'Things That Fluctuate',
    emojiPairs: ['📈📉', '😊😢', '🌡️☀️', '⚖️📊'],
    words: ['STOCKS', 'MOOD', 'TEMPERATURE', 'WEIGHT'],
    correctAnswers: ['STOCKS', 'MOOD', 'TEMPERATURE', 'WEIGHT'],
    puzzles: [
      { emoji: '📈📉', answer: 'STOCKS' },
      { emoji: '😊😢', answer: 'MOOD' },
      { emoji: '🌡️☀️', answer: 'TEMPERATURE' },
      { emoji: '⚖️📊', answer: 'WEIGHT' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    date: '2025-08-28',
    theme: 'Forms of Leverage',
    emojiPairs: ['🏗️🔧', '💼🤝', '💰🏦', '🤐🔐'],
    words: ['CROWBAR', 'INFLUENCE', 'DEBT', 'BLACKMAIL'],
    correctAnswers: ['CROWBAR', 'INFLUENCE', 'DEBT', 'BLACKMAIL'],
    puzzles: [
      { emoji: '🏗️🔧', answer: 'CROWBAR' },
      { emoji: '💼🤝', answer: 'INFLUENCE' },
      { emoji: '💰🏦', answer: 'DEBT' },
      { emoji: '🤐🔐', answer: 'BLACKMAIL' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    date: '2025-08-29',
    theme: 'Things That Compound',
    emojiPairs: ['💰📈', '❄️⛄', '🧩🤔', '💊🧪'],
    words: ['INTEREST', 'SNOW', 'PROBLEMS', 'MEDICINE'],
    correctAnswers: ['INTEREST', 'SNOW', 'PROBLEMS', 'MEDICINE'],
    puzzles: [
      { emoji: '💰📈', answer: 'INTEREST' },
      { emoji: '❄️⛄', answer: 'SNOW' },
      { emoji: '🧩🤔', answer: 'PROBLEMS' },
      { emoji: '💊🧪', answer: 'MEDICINE' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Create a map of existing puzzles by date
const puzzleMap = new Map();
allPuzzles.puzzles.forEach(puzzle => {
  puzzleMap.set(puzzle.date, puzzle);
});

// Replace/add new puzzles
newPuzzles.forEach(puzzle => {
  puzzleMap.set(puzzle.date, puzzle);
});

// Convert back to array and sort by date
const updatedPuzzles = Array.from(puzzleMap.values()).sort((a, b) => 
  new Date(a.date) - new Date(b.date)
);

// Write back to file
const updatedData = { puzzles: updatedPuzzles };
fs.writeFileSync(allPuzzlesPath, JSON.stringify(updatedData, null, 2));

console.log('✅ Successfully updated puzzles for dates:');
newPuzzles.forEach(p => console.log(`   - ${p.date}: ${p.theme}`));
console.log('\n📁 Updated file: public/puzzles/all-puzzles.json');