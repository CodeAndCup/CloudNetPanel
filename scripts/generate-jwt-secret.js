#!/usr/bin/env node
/**
 * JWT Secret Generator
 * Generates a cryptographically secure random secret for JWT signing
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function main() {
  const secret = generateSecret();
  
  console.log('\n🔑 JWT Secret Generated Successfully!\n');
  console.log('Add this to your .env file:\n');
  console.log(`JWT_SECRET=${secret}\n`);
  console.log('⚠️  Keep this secret safe and never commit it to version control!\n');
  
  // Optionally append to .env if it exists
  const envPath = path.join(__dirname, '..', 'server', '.env');
  
  if (process.argv.includes('--save') || process.argv.includes('-s')) {
    try {
      const envExists = fs.existsSync(envPath);
      
      if (envExists) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('JWT_SECRET=')) {
          console.log('⚠️  JWT_SECRET already exists in .env file.');
          console.log('    Remove the old one and manually add the new secret if needed.\n');
        } else {
          fs.appendFileSync(envPath, `\nJWT_SECRET=${secret}\n`);
          console.log('✅ JWT_SECRET added to .env file\n');
        }
      } else {
        fs.writeFileSync(envPath, `JWT_SECRET=${secret}\n`);
        console.log('✅ .env file created with JWT_SECRET\n');
      }
    } catch (error) {
      console.error('❌ Error writing to .env:', error.message);
      process.exit(1);
    }
  } else {
    console.log('💡 Tip: Use --save or -s flag to automatically add to .env file\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateSecret };
