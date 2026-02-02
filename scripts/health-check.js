#!/usr/bin/env node

/**
 * Health Check Script for CloudNet Panel
 * Verifies all system components are functioning
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

const checks = {
  api: false,
  database: false,
  directories: false,
  diskSpace: false
};

/**
 * Check if API is responding
 */
function checkAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        checks.api = res.statusCode === 200;
        resolve(checks.api);
      });
    });

    req.on('error', () => {
      checks.api = false;
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      checks.api = false;
      resolve(false);
    });

    req.end();
  });
}

/**
 * Check if database is accessible
 */
function checkDatabase() {
  const dbPath = path.join(__dirname, '..', 'server', 'database', 'cloudnet_panel.db');
  
  try {
    if (fs.existsSync(dbPath)) {
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      checks.database = true;
      return true;
    }
  } catch (error) {
    checks.database = false;
  }
  return false;
}

/**
 * Check if required directories exist and are writable
 */
function checkDirectories() {
  const dirs = [
    path.join(__dirname, '..', 'server', 'database'),
    path.join(__dirname, '..', 'server', 'backups'),
    path.join(__dirname, '..', 'server', 'logs')
  ];

  try {
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        checks.directories = false;
        return false;
      }
      fs.accessSync(dir, fs.constants.W_OK);
    }
    checks.directories = true;
    return true;
  } catch (error) {
    checks.directories = false;
    return false;
  }
}

/**
 * Check disk space
 */
function checkDiskSpace() {
  try {
    const dbPath = path.join(__dirname, '..', 'server', 'database');
    const stats = fs.statfsSync ? fs.statfsSync(dbPath) : null;
    
    if (stats) {
      const freeSpace = stats.bavail * stats.bsize;
      const freeSpaceMB = freeSpace / (1024 * 1024);
      checks.diskSpace = freeSpaceMB > 100; // At least 100MB free
      return checks.diskSpace;
    }
    
    // If statfs not available, assume OK
    checks.diskSpace = true;
    return true;
  } catch (error) {
    checks.diskSpace = true; // Assume OK if we can't check
    return true;
  }
}

/**
 * Run all health checks
 */
async function runHealthCheck() {
  console.log('🏥 Running health checks...\n');

  // Run checks
  await checkAPI();
  checkDatabase();
  checkDirectories();
  checkDiskSpace();

  // Print results
  console.log('Results:');
  console.log(`  API:         ${checks.api ? '✅' : '❌'} ${checks.api ? 'OK' : 'Failed'}`);
  console.log(`  Database:    ${checks.database ? '✅' : '❌'} ${checks.database ? 'OK' : 'Not accessible'}`);
  console.log(`  Directories: ${checks.directories ? '✅' : '❌'} ${checks.directories ? 'OK' : 'Not writable'}`);
  console.log(`  Disk Space:  ${checks.diskSpace ? '✅' : '❌'} ${checks.diskSpace ? 'OK' : 'Low'}`);

  const allPassed = Object.values(checks).every(check => check === true);

  console.log(`\nStatus: ${allPassed ? '✅ All checks passed' : '❌ Some checks failed'}\n`);

  return allPassed;
}

// Run health check
runHealthCheck()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Health check error:', error);
    process.exit(1);
  });
