#!/usr/bin/env node

/**
 * Quick test script to verify timezone implementation
 */

// Test LocalDateService
const localDateService = require('./src/services/localDateService');
const { getCurrentPuzzleNumber, getDateForPuzzleNumber } = require('./src/lib/puzzleNumber');

console.log('\n🧪 TIMEZONE IMPLEMENTATION TEST\n');
console.log('='.repeat(50));

// Test 1: LocalDateService
console.log('\n1. LocalDateService Tests:');
console.log('   Current Date String:', localDateService.getCurrentDateString());
console.log('   Storage Key:', localDateService.getTodayStorageKey());
console.log('   Debug Info:', JSON.stringify(localDateService.getDebugInfo(), null, 2));

// Test 2: Date consistency
console.log('\n2. Date Consistency Check:');
const jsDate = new Date();
const jsDateString = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
const localServiceDate = localDateService.getCurrentDateString();
console.log('   JS Date:', jsDateString);
console.log('   LocalDateService:', localServiceDate);
console.log('   Match:', jsDateString === localServiceDate ? '✅ PASS' : '❌ FAIL');

// Test 3: Puzzle number
console.log('\n3. Puzzle Number Tests:');
const puzzleNumber = getCurrentPuzzleNumber();
const puzzleDate = getDateForPuzzleNumber(puzzleNumber);
console.log('   Current Puzzle Number:', puzzleNumber);
console.log('   Puzzle Date:', puzzleDate);
console.log('   Matches Local Date:', puzzleDate === localServiceDate ? '✅ PASS' : '❌ FAIL');

// Test 4: Storage key format
console.log('\n4. Storage Key Format:');
const storageKey = localDateService.getTodayStorageKey();
const expectedKey = `tandem_${jsDate.getFullYear()}_${jsDate.getMonth() + 1}_${jsDate.getDate()}`;
console.log('   Generated Key:', storageKey);
console.log('   Expected Key:', expectedKey);
console.log('   Match:', storageKey === expectedKey ? '✅ PASS' : '❌ FAIL');

// Test 5: Tomorrow/Yesterday
console.log('\n5. Date Navigation:');
const today = localDateService.getCurrentDateString();
const yesterday = localDateService.getYesterdayDateString(today);
const tomorrow = localDateService.getTomorrowDateString(today);
console.log('   Yesterday:', yesterday);
console.log('   Today:', today);
console.log('   Tomorrow:', tomorrow);

// Test 6: Date validation
console.log('\n6. Date Validation:');
console.log(
  '   Valid date "2025-10-19":',
  localDateService.isValidDateString('2025-10-19') ? '✅ PASS' : '❌ FAIL'
);
console.log(
  '   Invalid date "2025-13-45":',
  !localDateService.isValidDateString('2025-13-45') ? '✅ PASS' : '❌ FAIL'
);
console.log(
  '   Invalid format "10/19/2025":',
  !localDateService.isValidDateString('10/19/2025') ? '✅ PASS' : '❌ FAIL'
);

// Test 7: Future date detection
console.log('\n7. Future Date Detection:');
const futureDate = '2026-01-01';
const pastDate = '2024-01-01';
console.log(
  '   Is "2026-01-01" in future:',
  localDateService.isDateInFuture(futureDate) ? '✅ PASS' : '❌ FAIL'
);
console.log(
  '   Is "2024-01-01" in future:',
  !localDateService.isDateInFuture(pastDate) ? '✅ PASS' : '❌ FAIL'
);
console.log(
  '   Is today in future:',
  !localDateService.isDateInFuture(today) ? '✅ PASS' : '❌ FAIL'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ All timezone tests completed');
console.log('='.repeat(50));

// Test timezone info
console.log('\n📍 System Information:');
console.log('   Platform:', process.platform);
console.log('   Node Version:', process.version);
console.log('   Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('   Locale:', Intl.DateTimeFormat().resolvedOptions().locale);
console.log('   Current Time:', new Date().toString());
console.log('   UTC Time:', new Date().toISOString());

console.log('\n');
