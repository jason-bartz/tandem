#!/usr/bin/env node

const puzzles = [
  {
    date: '2025-08-23',
    theme: 'Things That Erode',
    puzzles: [
      { emoji: '🏖️🌊', answer: 'BEACH' },
      { emoji: '🤝💔', answer: 'TRUST' },
      { emoji: '⛰️💨', answer: 'MOUNTAIN' },
      { emoji: '💵📉', answer: 'VALUE' }
    ]
  },
  {
    date: '2025-08-24',
    theme: 'Types of Anchors',
    puzzles: [
      { emoji: '⚓🚢', answer: 'SHIP' },
      { emoji: '📺📰', answer: 'NEWS' },
      { emoji: '👨‍👩‍👧💕', answer: 'FAMILY' },
      { emoji: '🏃🏁', answer: 'RELAY' }
    ]
  },
  {
    date: '2025-08-25',
    theme: 'Forms of Resistance',
    puzzles: [
      { emoji: '💨🏢', answer: 'WIND' },
      { emoji: '💪🦠', answer: 'IMMUNE' },
      { emoji: '✊📢', answer: 'PROTEST' },
      { emoji: '💧🧥', answer: 'WATER' }
    ]
  },
  {
    date: '2025-08-26',
    theme: 'Types of Signatures',
    puzzles: [
      { emoji: '✍️📄', answer: 'WRITTEN' },
      { emoji: '🎵🎶', answer: 'MUSICAL' },
      { emoji: '👃🌹', answer: 'SCENT' },
      { emoji: '🔬🧬', answer: 'GENETIC' }
    ]
  },
  {
    date: '2025-08-27',
    theme: 'Things That Fluctuate',
    puzzles: [
      { emoji: '📈📉', answer: 'STOCKS' },
      { emoji: '😊😢', answer: 'MOOD' },
      { emoji: '🌡️☀️', answer: 'TEMPERATURE' },
      { emoji: '⚖️📊', answer: 'WEIGHT' }
    ]
  },
  {
    date: '2025-08-28',
    theme: 'Forms of Leverage',
    puzzles: [
      { emoji: '🏗️🔧', answer: 'CROWBAR' },
      { emoji: '💼🤝', answer: 'INFLUENCE' },
      { emoji: '💰🏦', answer: 'DEBT' },
      { emoji: '🤐🔐', answer: 'BLACKMAIL' }
    ]
  },
  {
    date: '2025-08-29',
    theme: 'Things That Compound',
    puzzles: [
      { emoji: '💰📈', answer: 'INTEREST' },
      { emoji: '❄️⛄', answer: 'SNOW' },
      { emoji: '🧩🤔', answer: 'PROBLEMS' },
      { emoji: '💊🧪', answer: 'MEDICINE' }
    ]
  }
];

// Use the local development server
const API_URL = 'http://localhost:3000/api/admin/puzzles';

// Get the admin token from the command line argument or use a default
const token = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRhbmRlbUFkbWluMjAyNCIsImlhdCI6MTcyNDI4MTk0NCwiZXhwIjoxNzI0MzY4MzQ0fQ.cIwqAVcCuMzTzFBuPnz7lLYOLdVRdPwLMqdjFhJA0Vc';

async function addPuzzle(puzzleData) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        date: puzzleData.date,
        theme: puzzleData.theme,
        puzzles: puzzleData.puzzles
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Added puzzle for ${puzzleData.date}: ${puzzleData.theme}`);
    } else {
      console.error(`❌ Failed to add puzzle for ${puzzleData.date}:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Error adding puzzle for ${puzzleData.date}:`, error.message);
  }
}

async function main() {
  console.log('Adding puzzles to database...\n');
  console.log('Note: Make sure the dev server is running (npm run dev)\n');
  
  for (const puzzle of puzzles) {
    await addPuzzle(puzzle);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✨ Finished processing all puzzles!');
}

main().catch(console.error);