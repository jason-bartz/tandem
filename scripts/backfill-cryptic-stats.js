#!/usr/bin/env node
/**
 * Migration Script: Backfill Cryptic Stats to Database
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillCrypticStats() {
  console.log('Starting Cryptic Stats Database Backfill...\n');

  const { data: users } = await supabase.auth.admin.listUsers();
  console.log(`Found ${users.users.length} users\n`);

  let processed = 0;
  for (const user of users.users) {
    const { data: existing } = await supabase
      .from('user_cryptic_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existing || existing.total_completed === 0) {
      await supabase.from('user_cryptic_stats').upsert({
        user_id: user.id,
        total_completed: 0,
        current_streak: 0,
        longest_streak: 0,
        total_hints_used: 0,
        perfect_solves: 0,
        average_time: 0,
        completed_puzzles: {},
      });
      processed++;
    }
  }

  console.log(`Processed ${processed} users`);
  console.log('Migration complete!');
}

backfillCrypticStats().catch(console.error);
