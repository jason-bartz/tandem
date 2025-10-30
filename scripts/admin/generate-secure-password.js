#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generate a cryptographically secure password
 */
function generateSecurePassword(length = 24) {
  // Character sets for password generation
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each set
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

/**
 * Generate a secure admin username
 */
function generateAdminUsername() {
  const adjectives = ['swift', 'secure', 'prime', 'alpha', 'delta', 'sigma', 'omega', 'nova', 'apex', 'zenith'];
  const nouns = ['admin', 'keeper', 'guardian', 'sentinel', 'warden', 'overseer', 'custodian', 'steward'];
  const randomNum = crypto.randomInt(1000, 9999);
  
  const adjective = adjectives[crypto.randomInt(adjectives.length)];
  const noun = nouns[crypto.randomInt(nouns.length)];
  
  return `${adjective}_${noun}_${randomNum}`;
}

console.log('\n=== Secure Credentials Generator ===\n');

// Generate admin username
const username = generateAdminUsername();
console.log('Generated Admin Username:');
console.log('-'.repeat(50));
console.log(username);
console.log('-'.repeat(50));

// Generate secure password
const password = generateSecurePassword(24);
console.log('\nGenerated Secure Password:');
console.log('-'.repeat(50));
console.log(password);
console.log('-'.repeat(50));

console.log('\n📋 Next Steps:');
console.log('1. Hash the password using: node scripts/hash-password.js "' + password + '"');
console.log('2. Save the hashed password to your environment variables');
console.log('3. Keep the original password secure for login');

console.log('\n⚠️  IMPORTANT:');
console.log('- Save the original password in a secure password manager');
console.log('- Never commit passwords to version control');
console.log('- Use different credentials for development and production');