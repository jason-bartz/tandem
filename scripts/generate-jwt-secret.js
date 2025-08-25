#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generate a cryptographically secure JWT secret
 */
function generateJwtSecret() {
  // Generate 64 bytes of random data (512 bits)
  const secret = crypto.randomBytes(64).toString('base64');
  
  console.log('\n=== JWT Secret Generator ===\n');
  console.log('Generated secure JWT secret:');
  console.log('-'.repeat(50));
  console.log(secret);
  console.log('-'.repeat(50));
  console.log('\nAdd this to your .env.local or production environment variables:');
  console.log(`JWT_SECRET=${secret}`);
  console.log('\n⚠️  IMPORTANT:');
  console.log('- Keep this secret secure and never commit it to version control');
  console.log('- Use different secrets for development and production');
  console.log('- Rotate this secret periodically for enhanced security');
  console.log('- Store production secrets in secure environment variable management systems');
}

generateJwtSecret();