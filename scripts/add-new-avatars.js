// ==============================================================================
// Add New Avatars Script
// ==============================================================================
// This script adds 4 new avatars to the database: Buddy, Penelope, Quill, Tobey
// Run with: node scripts/add-new-avatars.js
// ==============================================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// New avatar data
const newAvatars = [
  {
    display_name: 'Buddy',
    bio: 'The most chill puzzle solver you\'ll ever meet. Buddy\'s relaxed approach somehow leads to a 500 day streak. Unfazed by difficulty, unimpressed by your panic.',
    image_path: '/images/avatars/Buddy.png',
    is_active: true,
    sort_order: 14
  },
  {
    display_name: 'Penelope',
    bio: 'Mysterious solver who appears silently, finishes the puzzle, and vanishes. May knock your coffee over while you\'re mid-thought.',
    image_path: '/images/avatars/Penelope.png',
    is_active: true,
    sort_order: 15
  },
  {
    display_name: 'Quill',
    bio: 'Calm and surprisingly sharp with vocabulary. Quill glides through word games with zero drama. Occasionally waddle away mid-puzzle for a piece of bread.',
    image_path: '/images/avatars/Quill.png',
    is_active: true,
    sort_order: 16
  },
  {
    display_name: 'Tobey',
    bio: 'Enthusiastic and fluffy with boundless optimism about every single puzzle. Gets distracted easily but somehow still finishes first. Leaves curly hair on all the letter tiles.',
    image_path: '/images/avatars/Tobey.png',
    is_active: true,
    sort_order: 17
  }
];

async function addNewAvatars() {
  console.log('🎨 Adding 4 new avatars to the database...');
  console.log('');

  try {
    // Check if avatars already exist
    const { data: existing, error: checkError } = await supabase
      .from('avatars')
      .select('display_name')
      .in('display_name', ['Buddy', 'Penelope', 'Quill', 'Tobey']);

    if (checkError) {
      throw checkError;
    }

    if (existing && existing.length > 0) {
      console.log('⚠️  Some avatars already exist:');
      existing.forEach(avatar => console.log(`   - ${avatar.display_name}`));
      console.log('');
      console.log('Skipping existing avatars and adding only new ones...');
      console.log('');

      // Filter out existing avatars
      const existingNames = existing.map(a => a.display_name);
      const avatarsToAdd = newAvatars.filter(
        avatar => !existingNames.includes(avatar.display_name)
      );

      if (avatarsToAdd.length === 0) {
        console.log('✅ All avatars already exist. Nothing to add.');
        return;
      }

      // Insert avatars one by one to get better error messages
      let addedCount = 0;
      for (const avatar of avatarsToAdd) {
        const { data, error } = await supabase
          .from('avatars')
          .insert([avatar])
          .select();

        if (error) {
          console.error(`❌ Failed to add ${avatar.display_name}:`, error.message);
          continue;
        }

        console.log(`   ✓ ${data[0].display_name} (sort order: ${data[0].sort_order})`);
        addedCount++;
      }

      console.log(`✅ Added ${addedCount} new avatar(s)`);
    } else {
      // No existing avatars, insert all
      console.log('📝 Inserting all 4 new avatars...');

      // Insert avatars one by one to get better error messages
      let addedCount = 0;
      for (const avatar of newAvatars) {
        const { data, error } = await supabase
          .from('avatars')
          .insert([avatar])
          .select();

        if (error) {
          console.error(`❌ Failed to add ${avatar.display_name}:`, error.message);
          continue;
        }

        console.log(`   ✓ ${data[0].display_name} (sort order: ${data[0].sort_order})`);
        addedCount++;
      }

      console.log(`✅ Added ${addedCount} avatar(s) successfully`);
    }

    // Verify the avatars
    console.log('');
    console.log('🔍 Verifying all avatars...');
    const { data: verification, error: verifyError } = await supabase
      .from('avatars')
      .select('display_name, bio, image_path, sort_order, is_active')
      .in('display_name', ['Buddy', 'Penelope', 'Quill', 'Tobey'])
      .order('sort_order');

    if (verifyError) {
      throw verifyError;
    }

    console.log('');
    console.log('✅ Verification successful! All 4 avatars are in the database:');
    console.log('');
    verification.forEach(avatar => {
      console.log(`📌 ${avatar.display_name}`);
      console.log(`   Bio: ${avatar.bio.substring(0, 60)}...`);
      console.log(`   Image: ${avatar.image_path}`);
      console.log(`   Active: ${avatar.is_active ? '✓' : '✗'}`);
      console.log(`   Sort Order: ${avatar.sort_order}`);
      console.log('');
    });

    // Get total avatar count
    const { count, error: countError } = await supabase
      .from('avatars')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (!countError) {
      console.log(`🎉 Total active avatars in database: ${count}`);
    }
    console.log('');
    console.log('🎊 Avatars are ready! They will now appear in the avatar selection modal.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('1. Make sure the avatars table exists in your database');
    console.error('2. Check your Supabase credentials in .env.local');
    console.error('3. Verify you have permission to insert into avatars table');
    console.error('4. Make sure the avatar images exist at public/images/avatars/');
    process.exit(1);
  }
}

addNewAvatars();
