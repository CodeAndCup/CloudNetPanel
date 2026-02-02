#!/usr/bin/env node

/**
 * Dry Run Server Test
 * Attempts to load index.js without actually starting the server
 */

require('dotenv').config();

// Set test environment
process.env.JWT_SECRET = 'test-secret-for-validation-at-least-32-characters-long';
process.env.PORT = '5556';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

console.log('🔍 Testing server index.js dry run...\n');

try {
  // Mock server.listen to prevent actual startup
  const http = require('http');
  const originalListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function(...args) {
    console.log('   ✅ Server would start on port:', args[0] || process.env.PORT);
    // Don't actually listen
    return this;
  };

  // Try to load the main server file
  console.log('1. Loading index.js...');
  require('./index.js');
  
  console.log('   ✅ index.js loaded successfully\n');
  
  console.log('✅ Dry run PASSED!');
  console.log('   Server can start without errors.\n');
  
  // Restore and exit
  http.Server.prototype.listen = originalListen;
  
  // Give a moment for async operations, then exit
  setTimeout(() => {
    process.exit(0);
  }, 1000);

} catch (error) {
  console.error('\n❌ Dry run FAILED!');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
