#!/usr/bin/env node

/**
 * Server Validation Script
 * Tests if the server can start without errors
 */

require('dotenv').config();

// Set test environment
process.env.JWT_SECRET = 'test-secret-for-validation-at-least-32-characters-long';
process.env.PORT = '5555'; // Use different port to avoid conflicts
process.env.NODE_ENV = 'test';

console.log('🔍 Starting server validation...\n');

try {
  // Try to require the main server file
  console.log('1. Loading server modules...');
  const express = require('express');
  console.log('   ✅ Express loaded');
  
  const { errorHandler, notFoundHandler, asyncHandler } = require('./utils/errors');
  console.log('   ✅ Error utilities loaded');
  
  const { validate } = require('./utils/validation');
  console.log('   ✅ Validation utilities loaded');
  
  const { validateStartup } = require('./utils/startup');
  console.log('   ✅ Startup validation loaded');
  
  const logger = require('./utils/logger');
  console.log('   ✅ Logger loaded');
  
  const { authenticateToken } = require('./middleware/auth');
  console.log('   ✅ Auth middleware loaded');
  
  const { checkCloudNetStatus } = require('./middleware/cloudnetStatus');
  console.log('   ✅ CloudNet middleware loaded');
  
  console.log('\n2. Loading route modules...');
  const authRoutes = require('./routes/auth');
  console.log('   ✅ Auth routes');
  const userRoutes = require('./routes/users');
  console.log('   ✅ User routes');
  const groupRoutes = require('./routes/groups');
  console.log('   ✅ Group routes');
  const taskRoutes = require('./routes/tasks');
  console.log('   ✅ Task routes');
  const templateRoutes = require('./routes/templates');
  console.log('   ✅ Template routes');
  const serverRoutes = require('./routes/servers');
  console.log('   ✅ Server routes');
  const nodeRoutes = require('./routes/nodes');
  console.log('   ✅ Node routes');
  const systemRoutes = require('./routes/system');
  console.log('   ✅ System routes');
  const backupRoutes = require('./routes/backups');
  console.log('   ✅ Backup routes');
  const activitiesRoutes = require('./routes/activities');
  console.log('   ✅ Activities routes');
  const webhookRoutes = require('./routes/webhooks');
  console.log('   ✅ Webhook routes');
  const updatesRoutes = require('./routes/updates');
  console.log('   ✅ Updates routes');
  const cloudnetRoutes = require('./routes/cloudnet');
  console.log('   ✅ CloudNet routes');
  
  console.log('\n3. Validating startup requirements...');
  validateStartup({ strict: false, generateSecret: false })
    .then(() => {
      console.log('   ✅ Startup validation passed\n');
      console.log('✅ All validations passed!');
      console.log('   Server is ready to start.\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('   ❌ Startup validation failed:', err.message);
      process.exit(1);
    });

} catch (error) {
  console.error('\n❌ Validation failed!');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
