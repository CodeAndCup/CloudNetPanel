const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/sqlite');
const config = require('../config/cloudnet');

const router = express.Router();
const execAsync = promisify(exec);

// Base directories
const TEMPLATES_DIR = path.join(config.cloudnet.serverPath, 'local/templates');
const BACKUPS_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
const ensureBackupDir = async () => {
  try {
    await fs.access(BACKUPS_DIR);
  } catch {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
  }
};

ensureBackupDir();

// Get all backups
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT b.*, u.username as created_by_username
    FROM backups b
    LEFT JOIN users u ON b.created_by = u.id
    ORDER BY b.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching backups:', err);
      return res.status(500).json({ error: 'Failed to fetch backups' });
    }
    res.json(rows);
  });
});

// Get backup by ID
router.get('/:id', authenticateToken, (req, res) => {
  const backupId = parseInt(req.params.id);

  db.get(`
    SELECT b.*, u.username as created_by_username
    FROM backups b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `, [backupId], (err, row) => {
    if (err) {
      console.error('Error fetching backup:', err);
      return res.status(500).json({ error: 'Failed to fetch backup' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json(row);
  });
});

// Create manual backup
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const { name, sourcePath } = req.body;

    if (!name || !sourcePath) {
      return res.status(400).json({ error: 'Backup name and source path required' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${name}-${timestamp}.tar.gz`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    const sourceFullPath = path.join(TEMPLATES_DIR, sourcePath);

    // Check if source exists
    try {
      await fs.access(sourceFullPath);
    } catch {
      return res.status(404).json({ error: 'Source path not found' });
    }

    // Create backup entry in database first
    const backupId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO backups (name, type, source_path, backup_path, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, 'manual', sourcePath, backupFileName, 'pending', req.user.id], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Create backup asynchronously
    const createBackup = async () => {
      try {
        const command = `cd "${TEMPLATES_DIR}" && tar -czf "${backupPath}" "${sourcePath}"`;
        await execAsync(command);

        const stats = await fs.stat(backupPath);

        // Update backup status
        db.run(`
          UPDATE backups 
          SET status = 'completed', size = ?
          WHERE id = ?
        `, [stats.size, backupId]);
      } catch (error) {
        console.error('Backup creation error:', error);
        db.run(`
          UPDATE backups 
          SET status = 'failed'
          WHERE id = ?
        `, [backupId]);
      }
    };

    // Start backup process
    createBackup();

    res.status(201).json({
      id: backupId,
      message: 'Backup started successfully',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Schedule automatic backup
router.post('/schedule', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, sourcePath, schedule } = req.body;

    if (!name || !sourcePath || !schedule) {
      return res.status(400).json({ error: 'Name, source path, and schedule required' });
    }

    // Validate cron expression (basic validation)
    const cronRegex = /^(\*|([0-9]|[1-5][0-9]))\s+(\*|([0-9]|1[0-9]|2[0-3]))\s+(\*|([1-9]|[12][0-9]|3[01]))\s+(\*|([1-9]|1[0-2]))\s+(\*|([0-6]))$/;
    if (!cronRegex.test(schedule)) {
      return res.status(400).json({ error: 'Invalid cron schedule format' });
    }

    const backupId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO backups (name, type, source_path, backup_path, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, 'scheduled', sourcePath, schedule, 'scheduled', req.user.id], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    res.status(201).json({
      id: backupId,
      message: 'Scheduled backup created successfully'
    });
  } catch (error) {
    console.error('Error creating scheduled backup:', error);
    res.status(500).json({ error: 'Failed to create scheduled backup' });
  }
});

// Download backup
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const backupId = parseInt(req.params.id);

    const backup = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM backups WHERE id = ?`, [backupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (backup.status !== 'completed') {
      return res.status(400).json({ error: 'Backup is not completed' });
    }

    const backupFilePath = path.join(BACKUPS_DIR, backup.backup_path);

    try {
      await fs.access(backupFilePath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }

    res.download(backupFilePath, backup.backup_path);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// Delete backup
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backupId = parseInt(req.params.id);

    const backup = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM backups WHERE id = ?`, [backupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete backup file from disk
    if (backup.backup_path && backup.status === 'completed') {
      const backupFilePath = path.join(BACKUPS_DIR, backup.backup_path);
      try {
        await fs.unlink(backupFilePath);
      } catch (error) {
        console.warn('Could not delete backup file from disk:', error.message);
      }
    }

    // Delete backup record from database
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM backups WHERE id = ?`, [backupId], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

module.exports = router;