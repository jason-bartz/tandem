#!/usr/bin/env node

/**
 * Apply migration 012: Remove cryptic_stats foreign key constraint
 *
 * This fixes the 500 error when saving stats for puzzles that don't
 * have a corresponding record in cryptic_puzzles table yet.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📋 Applying migration 012: Remove cryptic_stats foreign key...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '012_remove_cryptic_stats_fk.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution if exec_sql function doesn't exist
      console.log('⚠️  exec_sql function not found, trying direct execution...');

      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error: execError } = await supabase.rpc('exec', { sql: statement });

        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 012 applied successfully!');
    console.log('');
    console.log('The foreign key constraint has been removed from cryptic_stats.puzzle_date');
    console.log('Stats can now be saved even if the puzzle record doesn\'t exist yet.');

  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    console.log('');
    console.log('You can apply this migration manually in the Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/kzljqfonampglzyfzaai/sql/new');
    console.log('');
    console.log('SQL to execute:');
    console.log('----------------');
    console.log('ALTER TABLE cryptic_stats DROP CONSTRAINT IF EXISTS cryptic_stats_puzzle_date_fkey;');
    console.log('----------------');
    process.exit(1);
  }
}

applyMigration();
