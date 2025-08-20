const fs = require('fs');
const path = require('path');

// Get today's date and the 4 prior days
const today = new Date('2025-08-20');
const dates = [];
for (let i = 4; i >= 0; i--) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  dates.push(date.toISOString().split('T')[0]);
}

const puzzles = [
  {
    date: dates[0], // 4 days ago
    theme: 'Types of Leaders',
    puzzles: [
      { emoji: '👑🏰', answer: 'MONARCH' },
      { emoji: '👔🗳️', answer: 'PRESIDENT' },
      { emoji: '👨‍✈️✈️', answer: 'CAPTAIN' },
      { emoji: '🎭🎬', answer: 'DIRECTOR' }
    ]
  },
  {
    date: dates[1], // 3 days ago
    theme: 'Things That Echo',
    puzzles: [
      { emoji: '🏔️🗣️', answer: 'CANYON' },
      { emoji: '🕳️⬇️', answer: 'CAVE' },
      { emoji: '🏟️👏', answer: 'STADIUM' },
      { emoji: '🚇🚊', answer: 'TUNNEL' }
    ]
  },
  {
    date: dates[2], // 2 days ago
    theme: 'Types of Patterns',
    puzzles: [
      { emoji: '🦓⬛', answer: 'STRIPES' },
      { emoji: '🏁⬜', answer: 'CHECKERED' },
      { emoji: '👚🌸', answer: 'FLORAL' },
      { emoji: '🦒🟫', answer: 'SPOTS' }
    ]
  },
  {
    date: dates[3], // yesterday
    theme: 'Things That Spiral',
    puzzles: [
      { emoji: '🐚🌊', answer: 'SHELL' },
      { emoji: '🌀☁️', answer: 'TORNADO' },
      { emoji: '🍭🍬', answer: 'LOLLIPOP' },
      { emoji: '🌌⭐', answer: 'GALAXY' }
    ]
  },
  {
    date: dates[4], // today
    theme: 'Types of Thieves',
    puzzles: [
      { emoji: '🏴‍☠️🚢', answer: 'PIRATE' },
      { emoji: '🤠🐴', answer: 'BANDIT' },
      { emoji: '😷🏦', answer: 'ROBBER' },
      { emoji: '🦝🗑️', answer: 'RACCOON' }
    ]
  }
];

// Create puzzles directory if it doesn't exist
const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
if (!fs.existsSync(puzzlesDir)) {
  fs.mkdirSync(puzzlesDir, { recursive: true });
}

// Save each puzzle
puzzles.forEach((puzzle, index) => {
  const fileName = path.join(puzzlesDir, `${puzzle.date}.json`);
  
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

console.log('\n📅 Recent puzzles added:');
puzzles.forEach((puzzle, index) => {
  const dayLabel = index === 4 ? 'TODAY' : index === 3 ? 'YESTERDAY' : `${4-index} DAYS AGO`;
  console.log(`${puzzle.date} (${dayLabel}): ${puzzle.theme}`);
  puzzle.puzzles.forEach(p => {
    console.log(`  ${p.emoji} → ${p.answer}`);
  });
});