#!/usr/bin/env node

/**
 * Test script to verify the puzzle rotation scheduler
 * This script will:
 * 1. Check the current rotation status
 * 2. Show what puzzle is currently active
 * 3. Display when the next rotation will occur
 */

const https = require('http');

function fetchStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/rotate-puzzle',
      method: 'GET'
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.log('Raw response:', data);
          reject(new Error('Failed to parse response: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

function fetchCurrentPuzzle() {
  return new Promise((resolve, reject) => {
    https.get('http://localhost:3000/api/puzzle', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🎮 Tandem Puzzle Rotation Scheduler Test');
  console.log('=' .repeat(50));
  
  try {
    // Get rotation status
    const status = await fetchStatus();
    console.log('\n📅 Rotation Status:');
    console.log(`   Current Puzzle Date (ET): ${status.currentPuzzleDate}`);
    console.log(`   Last Rotation: ${status.lastRotation || 'Never'}`);
    console.log(`   Scheduler Running: ${status.schedulerRunning ? '✅ Yes' : '❌ No'}`);
    console.log(`   Current ET Time: ${status.etTime}`);
    console.log(`   Server Time (UTC): ${status.serverTime}`);
    
    // Get current puzzle
    const puzzle = await fetchCurrentPuzzle();
    console.log('\n🧩 Current Puzzle:');
    console.log(`   Date: ${puzzle.date}`);
    console.log(`   Display Date: ${puzzle.displayDate}`);
    console.log(`   Puzzle Number: #${puzzle.puzzleNumber}`);
    if (puzzle.puzzle) {
      console.log(`   Theme: ${puzzle.puzzle.theme || 'No theme'}`);
      console.log(`   Has ${puzzle.puzzle.puzzles ? puzzle.puzzle.puzzles.length : 0} questions`);
    }
    
    // Calculate next rotation
    const etNow = new Date(status.etTime);
    const tomorrow = new Date(etNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 12:01 AM
    
    const hoursUntilRotation = Math.floor((tomorrow - etNow) / (1000 * 60 * 60));
    const minutesUntilRotation = Math.floor(((tomorrow - etNow) % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log('\n⏰ Next Rotation:');
    console.log(`   Scheduled for: 12:01 AM ET`);
    console.log(`   Time until rotation: ${hoursUntilRotation}h ${minutesUntilRotation}m`);
    console.log(`   Next puzzle date will be: ${tomorrow.toISOString().split('T')[0]}`);
    
    console.log('\n✨ Scheduler Configuration:');
    console.log('   The puzzle automatically rotates every night at 12:01 AM Eastern Time');
    console.log('   This ensures all players get a new puzzle at the same time');
    console.log('   The scheduler handles DST changes automatically');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the Next.js development server is running:');
    console.log('   npm run dev');
  }
  
  console.log('\n' + '=' .repeat(50));
}

main();