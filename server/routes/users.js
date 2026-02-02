const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { validate, userCreateSchema, userUpdateSchema, idParamSchema } = require('../utils/validation');
const { asyncHandler, AuthorizationError, NotFoundError, ConflictError } = require('../utils/errors');
const db = require('../database/sqlite');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const users = await new Promise((resolve, reject) => {
    db.all(`
      SELECT id, username, email, role, created_at, last_login, status, language, is_active, is_online 
      FROM users
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  res.json({
    success: true,
    users
  });
}));

// Get user by ID
router.get('/:id', authenticateToken, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  // Users can only view their own profile unless they're admin
  if (req.user.role !== 'Administrators' && req.user.id !== userId) {
    throw new AuthorizationError('You can only view your own profile');
  }

  const user = await new Promise((resolve, reject) => {
    db.get(`
      SELECT id, username, email, role, created_at, last_login, status, language, is_active, is_online
      FROM users WHERE id = ?
    `, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    user
  });
}));

// Create new user (admin only)
router.post('/', 
  authenticateToken, 
  requireAdmin, 
  validate(userCreateSchema),
  logActivity('user_create', 'user', { resourceIdField: 'username' }), 
  asyncHandler(async (req, res) => {
    const { username, email, role, password } = req.body;

    // Check if username or email already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM users WHERE username = ? OR email = ?
      `, [username, email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      throw new ConflictError('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const userId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO users (username, email, password, role, is_active, is_online, created_at)
        VALUES (?, ?, ?, ?, 1, 0, ?)
      `, [username, email, hashedPassword, role, new Date().toISOString()], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Return the created user (without password)
    const newUser = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, email, role, created_at, last_login, status, language, is_active, is_online
        FROM users WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  })
);

// Update user
router.put('/:id', 
  authenticateToken,
  validate(idParamSchema, 'params'),
  validate(userUpdateSchema),
  logActivity('user_update', 'user'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, email, password, role } = req.body;

    // Users can only update their own profile unless they're admin
    // Non-admins cannot change their role
    if (req.user.role !== 'Administrators') {
      if (req.user.id !== userId) {
        throw new AuthorizationError('You can only update your own profile');
      }
      if (role) {
        throw new AuthorizationError('You cannot change your own role');
      }
    }

    // Check if user exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Check if username/email already taken by another user
    if (username || email) {
      const duplicate = await new Promise((resolve, reject) => {
        db.get(`
          SELECT id FROM users 
          WHERE (username = ? OR email = ?) AND id != ?
        `, [username || '', email || '', userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (duplicate) {
        throw new ConflictError('Username or email already exists');
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    if (role && req.user.role === 'Administrators') {
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Return updated user (without password)
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, email, role, created_at, last_login, status, language, is_active, is_online
        FROM users WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  })
);

// Delete user (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  logActivity('user_delete', 'user'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (req.user.id === userId) {
      throw new Error('You cannot delete your own account');
    }

    // Check if user exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(`SELECT id, username FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Delete user from database
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Also clean up related data
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM user_groups WHERE user_id = ?`, [userId], (err) => {
        if (err) console.error('Error deleting user groups:', err);
        resolve();
      });
    });

    res.json({
      success: true,
      message: `User ${existingUser.username} deleted successfully`
    });
  })
);

module.exports = router;
  }

  try {
    // Check if user exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (foreign key constraints will handle related data)
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;