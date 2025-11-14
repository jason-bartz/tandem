// ==============================================================================
// Apply Mini Database Schema Script
// ==============================================================================
// This script reads the supabase_mini_schema.sql file and applies it to the database
// Run with: node scripts/apply-mini-schema.js
// ==============================================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('💡 You need to run this SQL manually in Supabase SQL Editor:');
  console.error('   1. Go to https://app.supabase.com/project/_/sql');
  console.error('   2. Copy contents of supabase_mini_schema.sql');
  console.error('   3. Paste and run in SQL Editor');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  console.log('📋 Daily Mini Database Schema Application');
  console.log('==========================================');
  console.log('');

  // Read the SQL schema file
  const schemaPath = path.join(__dirname, '..', 'supabase_mini_schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  console.log('📖 Reading schema file...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split into individual statements (rough approach)
  const statements = schemaSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\/\*/));

  console.log(`📝 Found ${statements.length} SQL statements`);
  console.log('');

  console.log('⚠️  IMPORTANT: Supabase client cannot execute DDL statements directly.');
  console.log('');
  console.log('Please run the schema manually:');
  console.log('');
  console.log('1️⃣  Go to Supabase SQL Editor:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/')}/sql`);
  console.log('');
  console.log('2️⃣  Copy the contents of: supabase_mini_schema.sql');
  console.log('');
  console.log('3️⃣  Paste into SQL Editor and click "Run"');
  console.log('');
  console.log('4️⃣  Verify tables were created:');
  console.log('   - mini_puzzles');
  console.log('   - mini_stats');
  console.log('   - mini_user_stats');
  console.log('');
  console.log('After running the schema, run:');
  console.log('   node scripts/insert-test-puzzle.js');
  console.log('');

  // Try to check if tables exist (will fail gracefully if they don't)
  console.log('🔍 Checking existing tables...');
  try {
    const { data: puzzles, error: puzzleError } = await supabase
      .from('mini_puzzles')
      .select('count')
      .limit(1);

    if (!puzzleError) {
      console.log('✅ mini_puzzles table exists');
    }
  } catch (e) {
    console.log('❌ mini_puzzles table not found');
  }

  try {
    const { data: stats, error: statsError } = await supabase
      .from('mini_stats')
      .select('count')
      .limit(1);

    if (!statsError) {
      console.log('✅ mini_stats table exists');
    }
  } catch (e) {
    console.log('❌ mini_stats table not found');
  }

  try {
    const { data: userStats, error: userStatsError } = await supabase
      .from('mini_user_stats')
      .select('count')
      .limit(1);

    if (!userStatsError) {
      console.log('✅ mini_user_stats table exists');
    }
  } catch (e) {
    console.log('❌ mini_user_stats table not found');
  }
}

applySchema();
