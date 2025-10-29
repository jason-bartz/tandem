#!/usr/bin/env node
/**
 * Diagnostic script to test AI generation configuration
 * Run with: node test-ai-generation.js
 */

import 'dotenv/config';

console.log('═══════════════════════════════════════════════════════');
console.log('AI Generation Diagnostic Test');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: Environment Variables
console.log('1️⃣  Environment Variables:');
console.log('   ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Present' : '✗ Missing');
if (process.env.ANTHROPIC_API_KEY) {
  console.log('   - Length:', process.env.ANTHROPIC_API_KEY.length);
  console.log('   - Prefix:', process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...');
  console.log(
    '   - Format:',
    process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-') ? '✓ Valid' : '✗ Invalid'
  );
}
console.log(
  '   AI_GENERATION_ENABLED:',
  process.env.AI_GENERATION_ENABLED || 'not set (defaults to true)'
);
console.log(
  '   AI_MODEL:',
  process.env.AI_MODEL || 'not set (defaults to claude-sonnet-4-5-20250929)'
);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Test 2: Import AI Service
console.log('2️⃣  AI Service Import:');
try {
  const aiServiceModule = await import('./src/services/ai.service.js');
  const aiService = aiServiceModule.default;
  console.log('   ✓ Successfully imported ai.service.js');

  // Test 3: Check if enabled
  console.log('\n3️⃣  AI Service Enabled Check:');
  const enabled = aiService.isEnabled();
  console.log('   Result:', enabled ? '✓ Enabled' : '✗ Disabled');
  console.log('');

  if (!enabled) {
    console.log('   🚨 AI Service is DISABLED - check the diagnostics above');
    process.exit(1);
  }

  // Test 4: Try to create client
  console.log('4️⃣  Anthropic Client Creation:');
  const client = aiService.getClient();
  console.log('   Client:', client ? '✓ Created' : '✗ Failed to create');
  console.log('');

  if (!client) {
    console.log('   🚨 Failed to create Anthropic client');
    process.exit(1);
  }

  // Test 5: Test actual API call
  console.log('5️⃣  Testing Anthropic API Connection:');
  console.log('   Sending test request to Anthropic API...');

  try {
    const testMessage = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with just the word SUCCESS' }],
    });

    const response = testMessage.content[0].text;
    console.log('   ✓ API Response received:', response);
    console.log('   ✓ API connection working!');
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED - AI Generation should work!');
    console.log('═══════════════════════════════════════════════════════');
    console.log("\n💡 If you're still getting 503 errors:");
    console.log('   1. Check your server console logs (terminal where npm run dev is running)');
    console.log('   2. Look for lines starting with [ai.service] or [generate-puzzle]');
    console.log('   3. Restart your dev server: pkill -f "next dev" && npm run dev');
  } catch (error) {
    console.log('   ✗ API call failed');
    console.log('\n🚨 Error Details:');
    console.log('   Status:', error.status);
    console.log('   Message:', error.message);
    console.log('   Type:', error.error?.type);

    if (error.status === 401) {
      console.log('\n   ❌ AUTHENTICATION ERROR - Invalid API key');
      console.log('   → Check that your ANTHROPIC_API_KEY is correct');
      console.log('   → Get your key from: https://console.anthropic.com');
    } else if (error.status === 429) {
      console.log('\n   ⏱️  RATE LIMIT - Too many requests');
      console.log('   → Wait a few minutes and try again');
      console.log('   → Check your usage at: https://console.anthropic.com');
    } else if (error.status === 529) {
      console.log('\n   🔥 SERVICE OVERLOADED - Anthropic API is experiencing high load');
      console.log('   → Try again in a few minutes');
      console.log('   → Check status: https://status.anthropic.com');
    } else {
      console.log('\n   ❓ Unknown error - see details above');
    }

    process.exit(1);
  }
} catch (error) {
  console.log('   ✗ Failed to import ai.service.js');
  console.log('   Error:', error.message);
  console.log('\n   🚨 This is likely a code/module issue');
  process.exit(1);
}
