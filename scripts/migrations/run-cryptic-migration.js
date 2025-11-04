/**
 * Cryptic Puzzles Migration Script
 *
 * Runs the 004_cryptic_puzzles_schema.sql migration
 * Creates cryptic_puzzles, cryptic_stats, and cryptic_user_stats tables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function runMigration() {
  console.log('🚀 Starting cryptic puzzles migration...\n');

  try {
    // Read migration file
    const migrationPath = join(
      __dirname,
      '../../supabase/migrations/004_cryptic_puzzles_schema.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📖 Read migration file: 004_cryptic_puzzles_schema.sql');

    // Check if tables already exist
    console.log('\n🔍 Checking existing tables...');
    const { data: existingTables } = await supabase
      .from('cryptic_puzzles')
      .select('id')
      .limit(1);

    if (existingTables !== null) {
      console.log('⚠️  Warning: cryptic_puzzles table already exists');
      console.log('   This migration may fail if tables are already created.');
      console.log('   Continuing anyway...\n');
    }

    console.log('\n📝 Running migration...');
    console.log('   This will create:');
    console.log('   - cryptic_puzzles table');
    console.log('   - cryptic_stats table');
    console.log('   - cryptic_user_stats table');
    console.log('   - RLS policies and triggers');
    console.log('   - Helper functions\n');

    // Note: Supabase doesn't support running arbitrary SQL through the JS client
    // for security reasons. We need to use the SQL editor in the dashboard.
    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  IMPORTANT: Manual Migration Required');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nTo run this migration:');
    console.log('1. Go to your Supabase dashboard:');
    console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.com')}/project/_/sql`);
    console.log('\n2. Open the migration file:');
    console.log('   supabase/migrations/004_cryptic_puzzles_schema.sql');
    console.log('\n3. Copy the entire SQL file content');
    console.log('\n4. Paste it into the SQL Editor');
    console.log('\n5. Click "Run" (or press Cmd/Ctrl + Enter)');
    console.log('\n6. Verify success message');
    console.log('═══════════════════════════════════════════════════════\n');

    // After manual migration, verify the tables exist
    console.log('After running the migration manually, you can verify it worked by running:');
    console.log('  node scripts/migrations/verify-cryptic-migration.js\n');
  } catch (error) {
    console.error('\n❌ Migration setup failed:', error.message);
    process.exit(1);
  }
}

runMigration();
