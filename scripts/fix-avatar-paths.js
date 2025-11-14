/**
 * Fix Avatar Image Paths
 *
 * This script corrects malformed avatar paths in the database.
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

async function fixAvatarPaths() {
  console.log('🔍 Checking for malformed avatar paths...\n');

  try {
    // First, fetch all avatars to see what needs fixing
    const { data: avatars, error: fetchError } = await supabase
      .from('avatars')
      .select('id, display_name, image_path')
      .order('sort_order');

    if (fetchError) {
      console.error('❌ Error fetching avatars:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${avatars.length} avatars\n`);

    // Check which ones need fixing
    const needsFix = avatars.filter(
      (avatar) =>
        avatar.image_path.startsWith('/avatars//') ||
        avatar.image_path.startsWith('/avatars/images')
    );

    if (needsFix.length === 0) {
      console.log('✅ All avatar paths are correct! No fixes needed.\n');

      // Display all current paths for verification
      console.log('Current avatar paths:');
      avatars.forEach((avatar) => {
        console.log(`  ${avatar.display_name.padEnd(20)} → ${avatar.image_path}`);
      });

      return;
    }

    console.log(`Found ${needsFix.length} avatar(s) with incorrect paths:\n`);
    needsFix.forEach((avatar) => {
      console.log(`  ❌ ${avatar.display_name}: ${avatar.image_path}`);
    });

    console.log('\n🔧 Fixing paths...\n');

    // Fix each avatar
    for (const avatar of needsFix) {
      let fixedPath = avatar.image_path;

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
        .from('avatars')
        .update({ image_path: fixedPath })
        .eq('id', avatar.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${avatar.display_name}:`, updateError);
      } else {
        console.log(`  ✅ ${avatar.display_name.padEnd(20)}: ${avatar.image_path} → ${fixedPath}`);
      }
    }

    // Fetch and display final state
    const { data: updatedAvatars } = await supabase
      .from('avatars')
      .select('display_name, image_path')
      .order('sort_order');

    console.log('\n✅ All avatar paths fixed!\n');
    console.log('Updated avatar paths:');
    updatedAvatars.forEach((avatar) => {
      console.log(`  ${avatar.display_name.padEnd(20)} → ${avatar.image_path}`);
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

fixAvatarPaths();
