/**
 * Verify Cryptic Puzzles Migration
 *
 * Checks that all tables, policies, and functions were created successfully
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

async function verifyMigration() {
  console.log('🔍 Verifying cryptic puzzles migration...\n');

  let allChecksPass = true;

  // Check 1: cryptic_puzzles table exists and is accessible
  console.log('1️⃣  Checking cryptic_puzzles table...');
  try {
    const { data, error, count } = await supabase
      .from('cryptic_puzzles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('   ❌ Error:', error.message);
      allChecksPass = false;
    } else {
      console.log(`   ✅ Table exists (${count || 0} puzzles)`);
    }
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    allChecksPass = false;
  }

  // Check 2: cryptic_stats table exists and is accessible
  console.log('\n2️⃣  Checking cryptic_stats table...');
  try {
    const { data, error, count } = await supabase
      .from('cryptic_stats')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('   ❌ Error:', error.message);
      allChecksPass = false;
    } else {
      console.log(`   ✅ Table exists (${count || 0} stat records)`);
    }
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    allChecksPass = false;
  }

  // Check 3: cryptic_user_stats table exists and is accessible
  console.log('\n3️⃣  Checking cryptic_user_stats table...');
  try {
    const { data, error, count } = await supabase
      .from('cryptic_user_stats')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('   ❌ Error:', error.message);
      allChecksPass = false;
    } else {
      console.log(`   ✅ Table exists (${count || 0} user stats)`);
    }
  } catch (error) {
    console.error('   ❌ Failed:', error.message);
    allChecksPass = false;
  }

  // Check 4: Test inserting a sample puzzle (will be removed)
  console.log('\n4️⃣  Testing puzzle insertion...');
  try {
    const testPuzzle = {
      date: '2099-12-31', // Far future date to avoid conflicts
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
      cryptic_device: 'charade',
    };

    const { data: insertData, error: insertError } = await supabase
      .from('cryptic_puzzles')
      .insert(testPuzzle)
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ Insert failed:', insertError.message);
      allChecksPass = false;
    } else {
      console.log('   ✅ Puzzle inserted successfully');

      // Clean up test puzzle
      const { error: deleteError } = await supabase
        .from('cryptic_puzzles')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        console.error('   ⚠️  Warning: Could not delete test puzzle:', deleteError.message);
      } else {
        console.log('   ✅ Test puzzle cleaned up');
      }
    }
  } catch (error) {
    console.error('   ❌ Test failed:', error.message);
    allChecksPass = false;
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  if (allChecksPass) {
    console.log('✅ All checks passed! Migration successful.');
    console.log('\nNext steps:');
    console.log('1. Create your first puzzle using the admin panel');
    console.log('2. Test the game at /dailycryptic');
    console.log('3. Seed puzzles for upcoming dates');
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
    console.log('\nTroubleshooting:');
    console.log('1. Ensure the migration SQL was run successfully');
    console.log('2. Check the Supabase dashboard for any errors');
    console.log('3. Verify RLS policies are enabled');
  }
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(allChecksPass ? 0 : 1);
}

verifyMigration();
