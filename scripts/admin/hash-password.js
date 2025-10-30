#!/usr/bin/env node
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node hash-password.js <password>');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password hash for .env.local:');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log('\nAdd this to your .env.local file');