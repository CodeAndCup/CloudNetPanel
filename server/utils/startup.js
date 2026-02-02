/**
 * Startup Validation
 * Validates environment and system readiness before server starts
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REQUIRED_ENV_VARS = [
  {
    name: 'JWT_SECRET',
    validator: (value) => {
      if (!value) return 'JWT_SECRET is required';
      if (value.length < 32) return 'JWT_SECRET must be at least 32 characters long';
      if (value === 'cloudnet-panel-secret-key-change-in-production') {
        return 'JWT_SECRET cannot be the default value. Please generate a secure secret.';
      }
      return null;
    },
    critical: true
  },
  {
    name: 'PORT',
    validator: (value) => {
      const port = parseInt(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'PORT must be a valid number between 1 and 65535';
      }
      return null;
    },
    critical: false,
    default: '5000'
  },
  {
    name: 'NODE_ENV',
    validator: (value) => {
      const validEnvs = ['development', 'production', 'test'];
      if (value && !validEnvs.includes(value)) {
        return `NODE_ENV must be one of: ${validEnvs.join(', ')}`;
      }
      return null;
    },
    critical: false,
    default: 'development'
  }
];

const REQUIRED_DIRECTORIES = [
  { path: 'database', writable: true },
  { path: 'backups', writable: true }
];

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value && envVar.default) {
      process.env[envVar.name] = envVar.default;
      warnings.push(`Using default value for ${envVar.name}: ${envVar.default}`);
      continue;
    }

    const error = envVar.validator(value);
    if (error) {
      if (envVar.critical) {
        errors.push(error);
      } else {
        warnings.push(error);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate required directories exist and are writable
 */
function validateDirectories() {
  const errors = [];
  const warnings = [];
  const serverDir = path.join(__dirname, '..');

  for (const dir of REQUIRED_DIRECTORIES) {
    const dirPath = path.join(serverDir, dir.path);

    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        warnings.push(`Created missing directory: ${dir.path}`);
      } catch (error) {
        errors.push(`Failed to create directory ${dir.path}: ${error.message}`);
        continue;
      }
    }

    // Check if writable
    if (dir.writable) {
      try {
        const testFile = path.join(dirPath, '.write_test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (error) {
        errors.push(`Directory ${dir.path} is not writable: ${error.message}`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate database accessibility
 */
function validateDatabase() {
  const errors = [];
  const warnings = [];
  const dbPath = process.env.DB_PATH || './database/cloudnet_panel.db';
  const fullDbPath = path.join(__dirname, '..', dbPath);

  try {
    // Check if database file exists
    if (!fs.existsSync(fullDbPath)) {
      warnings.push('Database file does not exist, it will be created on first use');
    } else {
      // Try to read database file
      fs.accessSync(fullDbPath, fs.constants.R_OK | fs.constants.W_OK);
    }
  } catch (error) {
    errors.push(`Database not accessible: ${error.message}`);
  }

  return { errors, warnings };
}

/**
 * Validate port availability
 */
async function validatePort() {
  const errors = [];
  const warnings = [];
  const port = parseInt(process.env.PORT || '5000');

  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        errors.push(`Port ${port} is already in use`);
      } else {
        errors.push(`Port ${port} error: ${err.message}`);
      }
      resolve({ errors, warnings });
    });

    server.once('listening', () => {
      server.close();
      resolve({ errors, warnings });
    });

    server.listen(port);
  });
}

/**
 * Generate JWT secret if missing
 */
function generateJWTSecretIfMissing() {
  if (!process.env.JWT_SECRET) {
    const secret = crypto.randomBytes(64).toString('hex');
    console.log('\n⚠️  WARNING: JWT_SECRET not found in environment!');
    console.log('⚠️  A temporary secret has been generated for this session.');
    console.log('⚠️  THIS IS NOT SECURE FOR PRODUCTION!\n');
    console.log('Run this command to generate a permanent secret:\n');
    console.log('  npm run generate-secret\n');
    process.env.JWT_SECRET = secret;
    return true;
  }
  return false;
}

/**
 * Main validation function
 */
async function validateStartup(options = {}) {
  const { strict = true, generateSecret = false } = options;
  
  console.log('\n🔍 Running startup validation...\n');

  const allErrors = [];
  const allWarnings = [];

  // Generate JWT secret if allowed and missing
  if (generateSecret) {
    const wasGenerated = generateJWTSecretIfMissing();
    if (wasGenerated && strict) {
      allErrors.push('JWT_SECRET was auto-generated. Set a permanent secret in .env');
    }
  }

  // Validate environment
  const envResult = validateEnvironment();
  allErrors.push(...envResult.errors);
  allWarnings.push(...envResult.warnings);

  // Validate directories
  const dirResult = validateDirectories();
  allErrors.push(...dirResult.errors);
  allWarnings.push(...dirResult.warnings);

  // Validate database
  const dbResult = validateDatabase();
  allErrors.push(...dbResult.errors);
  allWarnings.push(...dbResult.warnings);

  // Validate port
  const portResult = await validatePort();
  allErrors.push(...portResult.errors);
  allWarnings.push(...portResult.warnings);

  // Print warnings
  if (allWarnings.length > 0) {
    console.log('⚠️  Warnings:');
    allWarnings.forEach(warning => console.log(`   - ${warning}`));
    console.log();
  }

  // Print errors
  if (allErrors.length > 0) {
    console.log('❌ Validation failed:\n');
    allErrors.forEach(error => console.log(`   - ${error}`));
    console.log();
    
    if (strict) {
      console.log('💡 Fix these issues before starting the server.\n');
      process.exit(1);
    }
  } else {
    console.log('✅ All validation checks passed!\n');
  }

  return {
    success: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

module.exports = {
  validateStartup,
  validateEnvironment,
  validateDirectories,
  validateDatabase,
  validatePort
};
