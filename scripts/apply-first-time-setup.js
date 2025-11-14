// ==============================================================================
// Apply First-Time Setup Database Migration Script
// ==============================================================================
// This script adds the has_completed_first_time_setup field to the users table
// Run with: node scripts/apply-first-time-setup.js
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
  console.error('   2. Copy contents of scripts/add-first-time-setup-field.sql');
  console.error('   3. Paste and run in SQL Editor');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📋 First-Time Setup Migration');
  console.log('===============================');
  console.log('');

  // Read the SQL migration file
  const migrationPath = path.join(__dirname, 'add-first-time-setup-field.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log('📖 Reading migration file...');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('');
  console.log('⚠️  IMPORTANT: Supabase client cannot execute DDL statements directly.');
  console.log('');
  console.log('Please run the migration manually:');
  console.log('');
  console.log('1️⃣  Go to Supabase SQL Editor:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/')}/sql`);
  console.log('');
  console.log('2️⃣  Copy and paste this SQL:');
  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log(migrationSql);
  console.log('─────────────────────────────────────────────');
  console.log('');
  console.log('3️⃣  Click "Run"');
  console.log('');
  console.log('✅ This will:');
  console.log('   • Add has_completed_first_time_setup column to users table');
  console.log('   • Set existing users with avatars to completed = true');
  console.log('   • Set new users without avatars to completed = false');
  console.log('');

  // Try to check if the column exists
  console.log('🔍 Checking if migration is needed...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('has_completed_first_time_setup')
      .limit(1);

    if (!error) {
      console.log('✅ has_completed_first_time_setup column already exists');
      console.log('✅ Migration already applied - no action needed!');
    } else if (error.code === '42703') {
      console.log('❌ Column does not exist - migration needed');
    }
  } catch (e) {
    console.log('❌ Could not check migration status');
  }
}

applyMigration();
