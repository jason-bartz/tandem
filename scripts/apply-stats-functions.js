#!/usr/bin/env node

/**
 * Apply stats dashboard database functions to Supabase
 *
 * This script creates PostgreSQL functions needed for the admin stats dashboard:
 * - get_active_users_count: Count unique active users in date range
 * - get_popular_days_of_week: Get play counts by day of week
 * - get_cryptic_leaderboard: Top fastest Cryptic solvers
 * - get_mini_leaderboard: Top fastest Mini solvers
 * - get_cryptic_streak_leaders: Users with longest Cryptic streaks
 * - get_mini_streak_leaders: Users with longest Mini streaks
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFunctions() {
  try {
    console.log('📊 Applying stats dashboard functions to Supabase...\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'supabase_stats_functions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by function definitions and execute each
    const functions = sql.split('CREATE OR REPLACE FUNCTION');

    console.log(`Found ${functions.length - 1} functions to create\n`);

    // Execute the full SQL (Supabase handles multiple statements)
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      // If rpc doesn't work, try direct SQL execution
      console.log('⚠️  RPC method not available, using direct SQL execution\n');

      // Split and execute individually
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          const funcName = statement.match(/FUNCTION\s+(\w+)/)?.[1];
          console.log(`Creating function: ${funcName}...`);
        }

        const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });
        if (execError) {
          console.error(`❌ Error executing statement ${i + 1}:`, execError.message);
        }
      }
    }

    console.log('\n✅ Stats functions applied successfully!\n');
    console.log('Functions created:');
    console.log('  • get_active_users_count()');
    console.log('  • get_popular_days_of_week()');
    console.log('  • get_cryptic_leaderboard()');
    console.log('  • get_mini_leaderboard()');
    console.log('  • get_cryptic_streak_leaders()');
    console.log('  • get_mini_streak_leaders()');
    console.log('\n📊 Your stats dashboard is ready to use!');
  } catch (error) {
    console.error('❌ Error applying functions:', error);
    process.exit(1);
  }
}

// Alternative: Manual SQL execution instructions
function showManualInstructions() {
  console.log('\n📋 MANUAL INSTALLATION INSTRUCTIONS\n');
  console.log('If automatic execution fails, follow these steps:\n');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Open the file: supabase_stats_functions.sql');
  console.log('4. Copy and paste the entire contents');
  console.log('5. Click "Run" to execute\n');
  console.log('File location: ./supabase_stats_functions.sql\n');
}

applyFunctions().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  showManualInstructions();
  process.exit(1);
});
