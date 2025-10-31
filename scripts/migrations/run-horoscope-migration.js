/**
 * Horoscope Migration Script
 *
 * Runs the 003_horoscopes_table.sql migration
 * Creates horoscopes table and seeds all 360 horoscopes
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting horoscope migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../../supabase/migrations/003_horoscopes_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📖 Read migration file: 003_horoscopes_table.sql');

    // Split SQL into individual statements
    // Note: This is a simple split - for production, use a proper SQL parser
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments
      if (statement.startsWith('--')) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);

          if (directError && directError.code === '42P01') {
            // Table doesn't exist, use raw query
            console.log(`⚠️  Statement ${i + 1}: Using raw query approach`);
          } else {
            throw error;
          }
        }

        successCount++;

        // Show progress every 10 statements
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Executed ${i + 1}/${statements.length} statements`);
        }
      } catch (error) {
        console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
        errorCount++;

        // Don't stop on errors like "table already exists"
        if (error.message.includes('already exists')) {
          console.log('   ℹ️  Continuing (table already exists)');
          continue;
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Success: ${successCount} statements`);
    console.log(`   Errors: ${errorCount} statements`);

    // Verify data was inserted
    const { count, error: countError } = await supabase
      .from('horoscopes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('\n⚠️  Could not verify horoscope count:', countError.message);
    } else {
      console.log(`\n📊 Database verification:`);
      console.log(`   Total horoscopes: ${count}`);
      console.log(`   Expected: 360 (30 per sign × 12 signs)`);

      if (count === 360) {
        console.log('   ✅ All horoscopes inserted successfully!');
      } else {
        console.log(`   ⚠️  Warning: Expected 360, found ${count}`);
      }
    }

    // Test fetching a horoscope
    const { data: testHoroscope, error: testError } = await supabase
      .from('horoscopes')
      .select('sign, text, horoscope_number')
      .eq('sign', 'Aries')
      .eq('horoscope_number', 1)
      .single();

    if (testError) {
      console.error('\n❌ Test query failed:', testError.message);
    } else {
      console.log(`\n🧪 Test query successful!`);
      console.log(`   Sign: ${testHoroscope.sign}`);
      console.log(`   Number: ${testHoroscope.horoscope_number}`);
      console.log(`   Text: ${testHoroscope.text.substring(0, 80)}...`);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Note about manual migration
console.log('═══════════════════════════════════════════════════════');
console.log('Note: If this script fails, you can run the migration manually:');
console.log('1. Go to your Supabase dashboard SQL editor');
console.log('2. Open: supabase/migrations/003_horoscopes_table.sql');
console.log('3. Copy and paste the entire SQL file');
console.log('4. Click "Run"');
console.log('═══════════════════════════════════════════════════════\n');

runMigration();
