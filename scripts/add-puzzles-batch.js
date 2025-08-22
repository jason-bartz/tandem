import { kv } from '@vercel/kv';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

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

async function addPuzzles() {
  console.log('Adding puzzles to database...\n');
  
  for (const puzzleData of puzzles) {
    try {
      const key = `puzzle:${puzzleData.date}`;
      await kv.set(key, JSON.stringify({
        theme: puzzleData.theme,
        puzzles: puzzleData.puzzles,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      console.log(`✅ Added puzzle for ${puzzleData.date}: ${puzzleData.theme}`);
    } catch (error) {
      console.error(`❌ Failed to add puzzle for ${puzzleData.date}:`, error);
    }
  }
  
  console.log('\n✨ All puzzles added successfully!');
  process.exit(0);
}

addPuzzles().catch(error => {
  console.error('Error adding puzzles:', error);
  process.exit(1);
});