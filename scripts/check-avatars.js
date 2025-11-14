// Quick script to check existing avatars in database

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatars() {
  console.log('🔍 Checking avatars in database...\n');

  const { data, error } = await supabase
    .from('avatars')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${data.length} avatars:\n`);
  data.forEach(avatar => {
    console.log(`${avatar.sort_order}. ${avatar.display_name}`);
    console.log(`   Active: ${avatar.is_active}`);
    console.log(`   Image: ${avatar.image_path}`);
    console.log(`   Bio: ${avatar.bio?.substring(0, 50)}...`);
    console.log('');
  });
}

checkAvatars();
