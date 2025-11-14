/**
 * Fix User Avatar URLs
 *
 * This script corrects malformed avatar_url paths in the users table.
 * Converts paths like /avatars//images/avatars/nutmeg.png
 * to the correct format: /images/avatars/nutmeg.png
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserAvatarUrls() {
  console.log('🔍 Checking for malformed avatar_url in users table...\n');

  try {
    // First, fetch all users to see what needs fixing
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .not('avatar_url', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${users.length} users with avatar_url set\n`);

    // Check which ones need fixing
    const needsFix = users.filter(
      (user) =>
        user.avatar_url &&
        (user.avatar_url.startsWith('/avatars//') || user.avatar_url.startsWith('/avatars/images'))
    );

    if (needsFix.length === 0) {
      console.log('✅ All user avatar URLs are correct! No fixes needed.\n');

      // Display a few sample paths for verification
      console.log('Sample user avatar URLs:');
      users.slice(0, 5).forEach((user) => {
        console.log(`  ${(user.username || 'Anonymous').padEnd(20)} → ${user.avatar_url}`);
      });

      return;
    }

    console.log(`Found ${needsFix.length} user(s) with incorrect avatar_url:\n`);
    needsFix.forEach((user) => {
      console.log(`  ❌ ${(user.username || user.id).padEnd(25)} ${user.avatar_url}`);
    });

    console.log('\n🔧 Fixing avatar URLs...\n');

    // Fix each user
    let fixedCount = 0;
    for (const user of needsFix) {
      let fixedPath = user.avatar_url;

      // Remove /avatars// prefix
      if (fixedPath.startsWith('/avatars//')) {
        fixedPath = fixedPath.replace('/avatars//', '/');
      }

      // Fix /avatars/images prefix
      if (fixedPath.startsWith('/avatars/images')) {
        fixedPath = fixedPath.replace('/avatars/images', '/images');
      }

      // Update in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: fixedPath })
        .eq('id', user.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${user.username || user.id}:`, updateError);
      } else {
        console.log(`  ✅ ${(user.username || user.id).padEnd(25)} ${user.avatar_url} → ${fixedPath}`);
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} user avatar URLs!\n`);

    // Fetch and display final state for users that were fixed
    const { data: updatedUsers } = await supabase
      .from('users')
      .select('username, avatar_url')
      .in('id', needsFix.map(u => u.id));

    console.log('Updated user avatar URLs:');
    updatedUsers.forEach((user) => {
      console.log(`  ${(user.username || 'Anonymous').padEnd(20)} → ${user.avatar_url}`);
    });

    console.log('\n🎉 All done! Leaderboard avatars should now display correctly.\n');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

fixUserAvatarUrls();
