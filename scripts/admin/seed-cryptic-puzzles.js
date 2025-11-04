/**
 * Seed Cryptic Puzzles
 *
 * Seeds sample cryptic puzzles for testing and demo purposes
 * Run with: node scripts/admin/seed-cryptic-puzzles.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Sample cryptic puzzles for seeding
const SAMPLE_PUZZLES = [
  {
    clue: '🔑 holding entrance = fundamental (7)',
    answer: 'KEYHOLE',
    length: 7,
    hints: [
      { type: 'fodder', text: '🔑 = KEY, entrance = HOLE' },
      { type: 'indicator', text: "'holding' means KEY contains HOLE" },
      { type: 'definition', text: "Definition is 'fundamental'" },
      { type: 'letter', text: 'Starts with K' },
    ],
    explanation: 'KEY (🔑) + HOLE (entrance) = KEYHOLE (fundamental opening)',
    difficulty_rating: 3,
    cryptic_device: 'container',
  },
  {
    clue: '🌙 before 🌟 = guide (9)',
    answer: 'MOONLIGHT',
    length: 9,
    hints: [
      { type: 'fodder', text: '🌙 = MOON, 🌟 = LIGHT' },
      { type: 'indicator', text: "'before' means place MOON before LIGHT" },
      { type: 'definition', text: "Definition is 'guide'" },
      { type: 'letter', text: 'Starts with M' },
    ],
    explanation: 'MOON (🌙) + LIGHT (🌟) = MOONLIGHT (something that guides in darkness)',
    difficulty_rating: 2,
    cryptic_device: 'charade',
  },
  {
    clue: '🎵 mixed up = noise (5)',
    answer: 'SOUND',
    length: 5,
    hints: [
      { type: 'fodder', text: '🎵 = music/sound' },
      { type: 'indicator', text: "'mixed up' suggests anagram or double meaning" },
      { type: 'definition', text: 'SOUND = noise AND music' },
      { type: 'letter', text: 'Starts with S' },
    ],
    explanation: 'SOUND (🎵) means both music and noise - double definition',
    difficulty_rating: 2,
    cryptic_device: 'double_definition',
  },
  {
    clue: '🌸 loses petals = flour container (5)',
    answer: 'FLOWER',
    length: 6,
    hints: [
      { type: 'fodder', text: '🌸 = FLOWER sounds like FLOUR' },
      { type: 'indicator', text: 'This is a homophone (sounds like)' },
      { type: 'definition', text: "FLOWER sounds like 'flour container'" },
      { type: 'letter', text: 'Starts with F' },
    ],
    explanation: 'FLOWER (🌸) sounds like FLOUR - homophone',
    difficulty_rating: 3,
    cryptic_device: 'homophone',
  },
  {
    clue: '🌳 + 🏠 = wooden structure (9)',
    answer: 'TREEHOUSE',
    length: 9,
    hints: [
      { type: 'fodder', text: '🌳 = TREE, 🏠 = HOUSE' },
      { type: 'indicator', text: "Place TREE before HOUSE" },
      { type: 'definition', text: 'Definition is wooden structure' },
      { type: 'letter', text: 'Starts with T' },
    ],
    explanation: 'TREE (🌳) + HOUSE (🏠) = TREEHOUSE (wooden structure)',
    difficulty_rating: 2,
    cryptic_device: 'charade',
  },
];

async function seedCrypticPuzzles() {
  console.log('🌱 Seeding cryptic puzzles...\n');

  try {
    // Get today's date
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 2); // Start 2 days ago

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(`📅 Seeding ${SAMPLE_PUZZLES.length} puzzles starting from ${startDate.toISOString().split('T')[0]}\n`);

    for (let i = 0; i < SAMPLE_PUZZLES.length; i++) {
      const puzzleDate = new Date(startDate);
      puzzleDate.setDate(puzzleDate.getDate() + i);
      const dateStr = puzzleDate.toISOString().split('T')[0];

      const puzzle = {
        ...SAMPLE_PUZZLES[i],
        date: dateStr,
      };

      try {
        // Check if puzzle already exists
        const { data: existing } = await supabase
          .from('cryptic_puzzles')
          .select('id')
          .eq('date', dateStr)
          .single();

        if (existing) {
          console.log(`⏭️  ${dateStr}: Skipped (already exists)`);
          skipCount++;
          continue;
        }

        // Insert puzzle
        const { data, error } = await supabase
          .from('cryptic_puzzles')
          .insert(puzzle)
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log(`✅ ${dateStr}: ${puzzle.answer} (${puzzle.cryptic_device})`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${dateStr}: Error - ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Inserted: ${successCount} puzzles`);
    console.log(`   ⏭️  Skipped: ${skipCount} puzzles`);
    console.log(`   ❌ Errors: ${errorCount} puzzles`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (successCount > 0) {
      console.log('🎉 Seeding complete! You can now:');
      console.log('   1. Test the game at /dailycryptic');
      console.log('   2. View puzzles in the admin panel');
      console.log('   3. Add more puzzles using the AI generator\n');
    }

    // Verify by fetching a puzzle
    if (successCount > 0) {
      const { data: testPuzzle, error: testError } = await supabase
        .from('cryptic_puzzles')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!testError && testPuzzle) {
        console.log('🧪 Test Query:');
        console.log(`   Date: ${testPuzzle.date}`);
        console.log(`   Clue: ${testPuzzle.clue}`);
        console.log(`   Answer: ${testPuzzle.answer}\n`);
      }
    }
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedCrypticPuzzles();
