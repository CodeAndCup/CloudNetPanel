const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken, checkFilePermission, requireAdmin } = require('../middleware/auth');
const db = require('../database/sqlite');

const router = express.Router();

// Base templates directory
const TEMPLATES_DIR = path.join(__dirname, '../../../CloudNet-Server/local/templates');

// Ensure templates directory exists
const ensureTemplatesDir = async () => {
  try {
    await fs.access(TEMPLATES_DIR);
  } catch {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    // Create some default template folders
    await fs.mkdir(path.join(TEMPLATES_DIR, 'spigot'), { recursive: true });
    await fs.mkdir(path.join(TEMPLATES_DIR, 'paper'), { recursive: true });
    await fs.mkdir(path.join(TEMPLATES_DIR, 'velocity'), { recursive: true });
    await fs.mkdir(path.join(TEMPLATES_DIR, 'waterfall'), { recursive: true });
  }
};

// Initialize templates directory
ensureTemplatesDir();

// Helper function to get safe file path
const getSafeFilePath = (relativePath) => {
  const safePath = path.normalize(relativePath || '').replace(/^(\.\.[\/\\])+/, '');
  return path.join(TEMPLATES_DIR, safePath);
};

// Helper function to get relative path from templates dir
const getRelativePath = (fullPath) => {
  return path.relative(TEMPLATES_DIR, fullPath);
};

// List files and directories
router.get('/files', authenticateToken, checkFilePermission('read'), async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    const fullPath = getSafeFilePath(requestedPath);
    
    // Ensure path is within templates directory
    if (!fullPath.startsWith(TEMPLATES_DIR)) {
      return res.status(403).json({ error: 'Access denied: Path outside templates directory' });
    }

    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      const items = await fs.readdir(fullPath);
      const fileList = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(fullPath, item);
          const itemStats = await fs.stat(itemPath);
          return {
            name: item,
            path: getRelativePath(itemPath),
            type: itemStats.isDirectory() ? 'directory' : 'file',
            size: itemStats.size,
            modified: itemStats.mtime,
            permissions: {
              read: true, // Will be determined by middleware
              write: true, // TODO: Check actual permissions
              delete: true // TODO: Check actual permissions
            }
          };
        })
      );
      
      res.json({
        currentPath: requestedPath,
        items: fileList.sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      });
    } else {
      res.json({
        currentPath: requestedPath,
        type: 'file',
        size: stats.size,
        modified: stats.mtime
      });
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File or directory not found' });
    }
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get file content
router.get('/files/content', authenticateToken, checkFilePermission('read'), async (req, res) => {
  try {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({ error: 'File path required' });
    }

    const fullPath = getSafeFilePath(requestedPath);
    
    // Ensure path is within templates directory
    if (!fullPath.startsWith(TEMPLATES_DIR)) {
      return res.status(403).json({ error: 'Access denied: Path outside templates directory' });
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot read directory as file' });
    }

    const content = await fs.readFile(fullPath, 'utf8');
    const ext = path.extname(fullPath).toLowerCase();
    
    // Determine file type for syntax highlighting
    let language = 'text';
    if (['.yml', '.yaml'].includes(ext)) language = 'yaml';
    else if (['.json'].includes(ext)) language = 'json';
    else if (['.js', '.javascript'].includes(ext)) language = 'javascript';
    else if (['.properties'].includes(ext)) language = 'properties';
    else if (['.xml'].includes(ext)) language = 'xml';
    else if (['.sh'].includes(ext)) language = 'bash';

    res.json({
      path: requestedPath,
      content,
      language,
      size: stats.size,
      modified: stats.mtime
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Create or update file content
router.put('/files/content', authenticateToken, checkFilePermission('write'), async (req, res) => {
  try {
    const { path: requestedPath, content } = req.body;
    
    if (!requestedPath || content === undefined) {
      return res.status(400).json({ error: 'File path and content required' });
    }

    const fullPath = getSafeFilePath(requestedPath);
    
    // Ensure path is within templates directory
    if (!fullPath.startsWith(TEMPLATES_DIR)) {
      return res.status(403).json({ error: 'Access denied: Path outside templates directory' });
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    await fs.writeFile(fullPath, content, 'utf8');
    const stats = await fs.stat(fullPath);

    res.json({
      message: 'File saved successfully',
      path: requestedPath,
      size: stats.size,
      modified: stats.mtime
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Create directory
router.post('/files/directory', authenticateToken, checkFilePermission('write'), async (req, res) => {
  try {
    const { path: requestedPath } = req.body;
    
    if (!requestedPath) {
      return res.status(400).json({ error: 'Directory path required' });
    }

    const fullPath = getSafeFilePath(requestedPath);
    
    // Ensure path is within templates directory
    if (!fullPath.startsWith(TEMPLATES_DIR)) {
      return res.status(403).json({ error: 'Access denied: Path outside templates directory' });
    }

    await fs.mkdir(fullPath, { recursive: true });

    res.json({
      message: 'Directory created successfully',
      path: requestedPath
    });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

// Delete file or directory
router.delete('/files', authenticateToken, checkFilePermission('delete'), async (req, res) => {
  try {
    const { path: requestedPath } = req.body;
    
    if (!requestedPath) {
      return res.status(400).json({ error: 'File path required' });
    }

    const fullPath = getSafeFilePath(requestedPath);
    
    // Ensure path is within templates directory
    if (!fullPath.startsWith(TEMPLATES_DIR)) {
      return res.status(403).json({ error: 'Access denied: Path outside templates directory' });
    }

    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }

    res.json({
      message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted successfully`,
      path: requestedPath
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File or directory not found' });
    }
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Upload file
router.post('/files/upload', authenticateToken, checkFilePermission('write'), async (req, res) => {
  // This will be implemented with multer middleware later
  res.status(501).json({ error: 'File upload not yet implemented' });
});

// Permission Management Endpoints (Admin only)

// Get permissions for a specific file/folder path
router.get('/permissions', authenticateToken, requireAdmin, async (req, res) => {
  const { path: requestedPath } = req.query;
  
  if (!requestedPath) {
    return res.status(400).json({ error: 'Path parameter required' });
  }

  try {
    // Get file permissions for the path
    const permissions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT fp.*, g.name as group_name, u.username 
        FROM file_permissions fp
        LEFT JOIN groups g ON fp.group_id = g.id
        LEFT JOIN users u ON fp.user_id = u.id
        WHERE fp.path = ?
        ORDER BY g.name, u.username
      `, [requestedPath], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      path: requestedPath,
      permissions: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Set permissions for a file/folder path
router.post('/permissions', authenticateToken, requireAdmin, async (req, res) => {
  const { path: requestedPath, permissions } = req.body;

  if (!requestedPath || !permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Path and permissions array required' });
  }

  try {
    // Begin transaction - first remove existing permissions
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM file_permissions WHERE path = ?', [requestedPath], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Add new permissions
    for (const perm of permissions) {
      const { type, permission_type, group_id, user_id } = perm;
      
      if (!permission_type || (!group_id && !user_id)) {
        continue; // Skip invalid permissions
      }

      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO file_permissions (path, group_id, user_id, permission_type)
          VALUES (?, ?, ?, ?)
        `, [requestedPath, group_id || null, user_id || null, permission_type], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ 
      message: 'Permissions updated successfully',
      path: requestedPath 
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// Delete a specific permission by ID
router.delete('/permissions/:permissionId', authenticateToken, requireAdmin, async (req, res) => {
  const permissionId = parseInt(req.params.permissionId);
  
  if (!permissionId) {
    return res.status(400).json({ error: 'Permission ID required' });
  }

  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM file_permissions WHERE id = ?', [permissionId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Permission removed successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

// Get all available groups and users for permission assignment
router.get('/permission-entities', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const groups = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, description FROM groups ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, email, role FROM users ORDER BY username', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ groups, users });
  } catch (error) {
    console.error('Error fetching permission entities:', error);
    res.status(500).json({ error: 'Failed to fetch groups and users' });
  }
});

module.exports = router;
module.exports = router;