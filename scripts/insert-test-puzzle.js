// ==============================================================================
// Insert Test Mini Puzzle Script
// ==============================================================================
// This script inserts a test puzzle into the database for testing purposes
// Run with: node scripts/insert-test-puzzle.js
// ==============================================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test puzzle data
const testPuzzle = {
  date: '2025-11-12',
  puzzle_number: 1,
  grid: [
    ["C","A","T","S","BLACK"],
    ["A","BLACK","O","BLACK","L"],
    ["R","E","S","T","O"],
    ["T","BLACK","A","BLACK","E"],
    ["BLACK","P","E","T","S"]
  ],
  clues: {
    across: [
      {
        number: 1,
        clue: "Feline pet",
        answer: "CATS",
        row: 0,
        col: 0,
        length: 4
      },
      {
        number: 5,
        clue: "Preposition indicating direction",
        answer: "TO",
        row: 1,
        col: 2,
        length: 2
      },
      {
        number: 6,
        clue: "Relaxation or sleep",
        answer: "RESTO",
        row: 2,
        col: 0,
        length: 5
      },
      {
        number: 8,
        clue: "Street, for short",
        answer: "SA",
        row: 3,
        col: 2,
        length: 2
      },
      {
        number: 9,
        clue: "Domesticated animals",
        answer: "PETS",
        row: 4,
        col: 1,
        length: 4
      }
    ],
    down: [
      {
        number: 1,
        clue: "Shopping vehicle",
        answer: "CART",
        row: 0,
        col: 0,
        length: 4
      },
      {
        number: 2,
        clue: "Consumed food",
        answer: "ATE",
        row: 0,
        col: 1,
        length: 3
      },
      {
        number: 3,
        clue: "Opposite of bottom",
        answer: "TOSS",
        row: 0,
        col: 2,
        length: 4
      },
      {
        number: 4,
        clue: "Metric unit of volume",
        answer: "SOLE",
        row: 0,
        col: 3,
        length: 4
      },
      {
        number: 7,
        clue: "Possess",
        answer: "OLE",
        row: 2,
        col: 4,
        length: 3
      }
    ]
  },
  difficulty_rating: 'Easy',
  theme: 'Animals & Everyday Words'
};

async function insertTestPuzzle() {
  console.log('🎯 Inserting test Mini puzzle...');
  console.log(`📅 Date: ${testPuzzle.date}`);
  console.log(`🔢 Puzzle #: ${testPuzzle.puzzle_number}`);
  console.log(`🎨 Theme: ${testPuzzle.theme}`);
  console.log(`⚡ Difficulty: ${testPuzzle.difficulty_rating}`);
  console.log('');

  try {
    // First check if puzzle already exists
    const { data: existing, error: checkError } = await supabase
      .from('mini_puzzles')
      .select('date, puzzle_number')
      .eq('date', testPuzzle.date)
      .single();

    if (existing) {
      console.log('⚠️  Puzzle already exists for this date. Updating...');

      const { data, error } = await supabase
        .from('mini_puzzles')
        .update(testPuzzle)
        .eq('date', testPuzzle.date)
        .select();

      if (error) {
        throw error;
      }

      console.log('✅ Puzzle updated successfully!');
      console.log(data);
    } else {
      console.log('📝 Inserting new puzzle...');

      const { data, error } = await supabase
        .from('mini_puzzles')
        .insert(testPuzzle)
        .select();

      if (error) {
        throw error;
      }

      console.log('✅ Puzzle inserted successfully!');
      console.log(data);
    }

    // Verify the puzzle
    console.log('');
    console.log('🔍 Verifying puzzle...');
    const { data: verification, error: verifyError } = await supabase
      .from('mini_puzzles')
      .select('*')
      .eq('date', testPuzzle.date)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('✅ Verification successful!');
    console.log(`Grid size: ${verification.grid.length}x${verification.grid[0].length}`);
    console.log(`Across clues: ${verification.clues.across.length}`);
    console.log(`Down clues: ${verification.clues.down.length}`);
    console.log('');
    console.log('🎉 Test puzzle is ready! You can now play at: /dailymini');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('1. Make sure the mini_puzzles table exists (run supabase_mini_schema.sql)');
    console.error('2. Check your Supabase credentials in .env.local');
    console.error('3. Verify you have permission to insert into mini_puzzles table');
    process.exit(1);
  }
}

insertTestPuzzle();
