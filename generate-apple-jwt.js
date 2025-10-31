const fs = require('fs');
const jwt = require('jsonwebtoken');

// Configuration - REPLACE WITH YOUR VALUES
const TEAM_ID = 'PQHL7LA8AX'; // Found in Apple Developer Account (top-right)
const KEY_ID = '67U8F4P2C5'; // The 10-char ID when you created the key
const CLIENT_ID = 'com.tandemdaily.app'; // Your bundle ID
const PRIVATE_KEY_PATH = './AuthKey_67U8F4P2C5.p8'; // Path to your downloaded .p8 file

// Read the private key
const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

// Generate JWT
const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000, // 6 months
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: KEY_ID,
  }
);

console.log('Your Apple JWT:');
console.log(token);
console.log('\nPaste this into Supabase Secret Key field');
