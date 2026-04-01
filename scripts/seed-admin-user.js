/* eslint-disable no-console */
/**
 * Seed the initial owner admin user into the admin_users table.
 *
 * Usage:
 *   node scripts/seed-admin-user.js
 *
 * This migrates the existing env-var-based admin to the database.
 * It uses the existing ADMIN_USERNAME and ADMIN_PASSWORD_HASH from .env.local
 * and prompts for a full name and email.
 *
 * After running this, the admin_users table will have your account as the owner.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n=== Tandem Admin User Migration ===\n');

  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!username || !passwordHash) {
    console.error('ERROR: ADMIN_USERNAME and ADMIN_PASSWORD_HASH must be set in .env.local');
    process.exit(1);
  }

  console.log(`Migrating existing admin: ${username}`);
  console.log('This will create an "owner" account in the admin_users table.\n');

  const fullName = await ask('Full name: ');
  const email = await ask('Email: ');

  if (!fullName.trim() || !email.trim()) {
    console.error('ERROR: Full name and email are required');
    process.exit(1);
  }

  // Check if user already exists
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('username', username)
    .single();

  if (existing) {
    console.log(`\nUser "${username}" already exists in admin_users. Updating...`);
    const { error } = await supabase
      .from('admin_users')
      .update({
        full_name: fullName.trim(),
        email: email.trim(),
        role: 'owner',
        is_active: true,
      })
      .eq('username', username);

    if (error) {
      console.error('ERROR updating user:', error.message);
      process.exit(1);
    }
    console.log('User updated successfully.');
  } else {
    const { error } = await supabase.from('admin_users').insert({
      username,
      password_hash: passwordHash,
      full_name: fullName.trim(),
      email: email.trim(),
      role: 'owner',
      is_active: true,
    });

    if (error) {
      console.error('ERROR creating user:', error.message);
      process.exit(1);
    }
    console.log('\nOwner account created successfully!');
  }

  console.log(`\n  Username: ${username}`);
  console.log(`  Name:     ${fullName.trim()}`);
  console.log(`  Email:    ${email.trim()}`);
  console.log(`  Role:     owner`);
  console.log('\nYou can now log in with your existing credentials.');
  console.log('The env vars ADMIN_USERNAME/ADMIN_PASSWORD_HASH are no longer required');
  console.log('once the admin_users table is populated.\n');

  rl.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  rl.close();
  process.exit(1);
});
