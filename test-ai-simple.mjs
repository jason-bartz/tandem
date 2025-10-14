#!/usr/bin/env node
/**
 * Simple AI generation test
 * Run with: node test-ai-simple.mjs
 */

import { readFileSync } from 'fs';

console.log('🧪 Testing AI Puzzle Generation Setup\n');

// Test 1: Check .env.local exists
console.log('1️⃣ Checking .env.local configuration...');
try {
  const envContent = readFileSync('.env.local', 'utf-8');

  if (envContent.includes('ANTHROPIC_API_KEY')) {
    const lines = envContent.split('\n');
    const apiKeyLine = lines.find(line => line.startsWith('ANTHROPIC_API_KEY='));
    if (apiKeyLine && apiKeyLine.split('=')[1]?.trim()) {
      console.log('✅ ANTHROPIC_API_KEY is configured');
    } else {
      console.error('❌ ANTHROPIC_API_KEY is empty');
      process.exit(1);
    }
  } else {
    console.error('❌ ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }

  if (envContent.includes('AI_MODEL')) {
    console.log('✅ AI_MODEL is configured');
  }

  if (envContent.includes('AI_GENERATION_ENABLED=true')) {
    console.log('✅ AI_GENERATION_ENABLED is true\n');
  }
} catch (error) {
  console.error('❌ Could not read .env.local:', error.message);
  process.exit(1);
}

// Test 2: Check AI service file exists
console.log('2️⃣ Checking AI service file...');
try {
  const aiServiceContent = readFileSync('src/services/ai.service.js', 'utf-8');
  if (aiServiceContent.includes('class AIService')) {
    console.log('✅ AI service file exists and has AIService class\n');
  }
} catch (error) {
  console.error('❌ AI service file not found:', error.message);
  process.exit(1);
}

// Test 3: Check API endpoint exists
console.log('3️⃣ Checking API endpoint...');
try {
  const apiContent = readFileSync('src/app/api/admin/generate-puzzle/route.js', 'utf-8');
  if (apiContent.includes('generatePuzzle')) {
    console.log('✅ API endpoint exists\n');
  }
} catch (error) {
  console.error('❌ API endpoint not found:', error.message);
  process.exit(1);
}

// Test 4: Check PuzzleEditor has AI button
console.log('4️⃣ Checking PuzzleEditor component...');
try {
  const editorContent = readFileSync('src/components/admin/PuzzleEditor.jsx', 'utf-8');
  if (editorContent.includes('handleGenerateWithAI') && editorContent.includes('AI Generate')) {
    console.log('✅ PuzzleEditor has AI generation button\n');
  } else {
    console.error('❌ AI generation not properly integrated in PuzzleEditor');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ PuzzleEditor file not found:', error.message);
  process.exit(1);
}

// Test 5: Check constants updated
console.log('5️⃣ Checking API constants...');
try {
  const constantsContent = readFileSync('src/lib/constants.js', 'utf-8');
  if (constantsContent.includes('ADMIN_GENERATE_PUZZLE')) {
    console.log('✅ ADMIN_GENERATE_PUZZLE endpoint is defined\n');
  }
} catch (error) {
  console.error('❌ Constants file not found:', error.message);
  process.exit(1);
}

console.log('🎉 All setup checks passed!\n');
console.log('📝 Next steps:');
console.log('   1. Make sure dev server is running: npm run dev');
console.log('   2. Navigate to admin panel: http://localhost:3000/admin');
console.log('   3. Go to puzzle editor and click "✨ AI Generate"');
console.log('   4. Watch the magic happen! ✨\n');
