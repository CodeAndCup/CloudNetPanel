#!/usr/bin/env node

const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const db = require('../server/database/sqlite');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function validateUsername(username) {
  if (!username || username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'Username can only contain letters, numbers, underscores and hyphens';
  }
  return null;
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email address';
  }
  return null;
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

async function checkUserExists(username, email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

async function createAdminUser(username, email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (username, email, password, role, is_active, is_online) 
       VALUES (?, ?, ?, 'Administrators', 1, 0)`,
      [username, email, hashedPassword],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   CloudNet Panel - Admin Setup Wizard   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  try {
    // Get username
    let username;
    while (true) {
      username = await question('Admin Username (min 3 chars, alphanumeric): ');
      const error = validateUsername(username);
      if (error) {
        console.log(`❌ ${error}`);
        continue;
      }
      break;
    }
    
    // Get email
    let email;
    while (true) {
      email = await question('Admin Email: ');
      const error = validateEmail(email);
      if (error) {
        console.log(`❌ ${error}`);
        continue;
      }
      break;
    }
    
    // Check if user already exists
    const exists = await checkUserExists(username, email);
    if (exists) {
      console.log('\n❌ User with this username or email already exists!');
      rl.close();
      process.exit(1);
    }
    
    // Get password
    let password;
    let confirmPassword;
    while (true) {
      password = await question('Admin Password (min 8 chars, must include: uppercase, lowercase, number): ');
      const error = validatePassword(password);
      if (error) {
        console.log(`❌ ${error}`);
        continue;
      }
      
      confirmPassword = await question('Confirm Password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match!');
        continue;
      }
      break;
    }
    
    // Create admin user
    console.log('\n⏳ Creating admin user...');
    const userId = await createAdminUser(username, email, password);
    
    console.log('\n✅ Admin user created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log(`User ID:  ${userId}`);
    console.log(`Username: ${username}`);
    console.log(`Email:    ${email}`);
    console.log(`Role:     Administrators`);
    console.log('═══════════════════════════════════════');
    console.log('\n🔐 Please keep these credentials secure!');
    console.log('💡 You can now login with these credentials.\n');
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createAdminUser };
