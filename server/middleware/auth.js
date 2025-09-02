const jwt = require('jsonwebtoken');
const db = require('../database/sqlite');

const JWT_SECRET = process.env.JWT_SECRET || 'cloudnet-panel-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Administrators') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user has permission for a specific file/folder
const checkFilePermission = (permissionType) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const filePath = req.params.path || req.body.path || req.query.path || '';

    // Admin always has access
    if (req.user.role === 'Administrators') {
      return next();
    }

    try {
      // Check direct user permissions
      const userPermission = await new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM file_permissions 
          WHERE user_id = ? AND (path = ? OR path = '') AND permission_type = ?
        `, [userId, filePath, permissionType], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (userPermission) {
        return next();
      }

      // Check group permissions
      const groupPermission = await new Promise((resolve, reject) => {
        db.get(`
          SELECT fp.* FROM file_permissions fp
          JOIN user_groups ug ON fp.group_id = ug.group_id
          WHERE ug.user_id = ? AND (fp.path = ? OR fp.path = '') AND fp.permission_type = ?
        `, [userId, filePath, permissionType], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (groupPermission) {
        return next();
      }

      // Check parent directory permissions for read access
      if (permissionType === 'read' && filePath) {
        const parentPermission = await new Promise((resolve, reject) => {
          db.get(`
            SELECT fp.* FROM file_permissions fp
            LEFT JOIN user_groups ug ON fp.group_id = ug.group_id
            WHERE (fp.user_id = ? OR ug.user_id = ?) 
            AND fp.permission_type = 'read'
            AND ? LIKE fp.path || '%'
            ORDER BY LENGTH(fp.path) DESC
            LIMIT 1
          `, [userId, userId, filePath], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (parentPermission) {
          return next();
        }
      }

      // For now, allow access to root directory for all authenticated users
      // In production, you would configure proper permissions
      if (filePath === '' || filePath === '/') {
        return next();
      }

      return res.status(403).json({ error: 'Insufficient permissions for this file operation' });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check if user has permission for a specific task
const checkTaskPermission = (permissionType) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const taskId = req.params.id || req.body.taskId;

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    // Admin always has access
    if (req.user.role === 'Administrators') {
      return next();
    }

    try {
      // Check direct user permissions
      const userPermission = await new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM task_permissions 
          WHERE user_id = ? AND task_id = ? AND permission_type = ?
        `, [userId, taskId, permissionType], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (userPermission) {
        return next();
      }

      // Check group permissions
      const groupPermission = await new Promise((resolve, reject) => {
        db.get(`
          SELECT tp.* FROM task_permissions tp
          JOIN user_groups ug ON tp.group_id = ug.group_id
          WHERE ug.user_id = ? AND tp.task_id = ? AND tp.permission_type = ?
        `, [userId, taskId, permissionType], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (groupPermission) {
        return next();
      }

      return res.status(403).json({ error: 'Insufficient permissions for this task operation' });
    } catch (error) {
      console.error('Task permission check error:', error);
      return res.status(500).json({ error: 'Task permission check failed' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  checkFilePermission,
  checkTaskPermission,
  JWT_SECRET
};