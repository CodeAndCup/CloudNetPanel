#!/usr/bin/env node

/**
 * Backup Script for CloudNet Panel
 * Creates compressed backups of database and configuration
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(__dirname, '..', 'server', 'backups');
const DB_PATH = path.join(__dirname, '..', 'server', 'database', 'cloudnet_panel.db');
const CONFIG_PATH = path.join(__dirname, '..', 'server', '.env');

// Keep backups for 7 days
const RETENTION_DAYS = 7;

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create backup filename with timestamp
 */
function getBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `backup-${timestamp}.tar.gz`;
}

/**
 * Create compressed backup
 */
async function createBackup() {
  ensureBackupDir();

  const backupFile = path.join(BACKUP_DIR, getBackupFilename());
  const tempDir = path.join(BACKUP_DIR, 'temp');

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Copy database
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, path.join(tempDir, 'cloudnet_panel.db'));
      console.log('✅ Database copied');
    } else {
      console.warn('⚠️  Database not found, skipping');
    }

    // Copy config (without secrets if possible)
    if (fs.existsSync(CONFIG_PATH)) {
      fs.copyFileSync(CONFIG_PATH, path.join(tempDir, '.env'));
      console.log('✅ Configuration copied');
    } else {
      console.warn('⚠️  .env not found, skipping');
    }

    // Create tarball
    const command = process.platform === 'win32'
      ? `tar -czf "${backupFile}" -C "${tempDir}" .`
      : `tar -czf "${backupFile}" -C "${tempDir}" .`;

    await execAsync(command);
    console.log(`✅ Backup created: ${backupFile}`);

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Get backup size
    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   Size: ${sizeMB} MB`);

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * Remove old backups
 */
function cleanOldBackups() {
  const now = Date.now();
  const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(BACKUP_DIR);
  let removed = 0;

  for (const file of files) {
    if (file.startsWith('backup-') && file.endsWith('.tar.gz')) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        removed++;
        console.log(`🗑️  Removed old backup: ${file}`);
      }
    }
  }

  if (removed === 0) {
    console.log('✅ No old backups to remove');
  } else {
    console.log(`✅ Removed ${removed} old backup(s)`);
  }
}

/**
 * Main backup routine
 */
async function main() {
  console.log('📦 CloudNet Panel Backup\n');

  try {
    await createBackup();
    console.log('\n🧹 Cleaning old backups...');
    cleanOldBackups();
    console.log('\n✅ Backup completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backup failed\n');
    process.exit(1);
  }
}

main();
