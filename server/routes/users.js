const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const db = require('../database/sqlite');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  db.all(`
    SELECT id, username, email, role, created_at, last_login, status, language FROM users;
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows);
  });
});

// Get user by ID
router.get('/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);

  // Users can only view their own profile unless they're admin
  if (req.user.role !== 'Administrators' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.get(`
    SELECT id, username, email, role, created_at, last_login, status, language 
    FROM users WHERE id = ?
  `, [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, logActivity('user_create', 'user', { resourceIdField: 'username' }), async (req, res) => {
  const { username, email, role, password, group } = req.body;

  if (!username || !email || !role || !password) {
    return res.status(400).json({ error: 'Missing required fields: username, email, role, password' });
  }

  try {
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
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const userId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO users (username, email, password, role, status)
        VALUES (?, ?, ?, ?, 'active')
      `, [username, email, hashedPassword, role], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // If group is specified, assign user to group
    if (group) {
      // Find group by name
      const groupData = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM groups WHERE name = ?`, [group], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (groupData) {
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT OR IGNORE INTO user_groups (user_id, group_id)
            VALUES (?, ?)
          `, [userId, groupData.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }

    // Return the created user (without password)
    const newUser = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, email, role, created_at, last_login, status, language 
        FROM users WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticateToken, logActivity('user_update', 'user'), async (req, res) => {
  const userId = parseInt(req.params.id);

  // Users can only update their own profile unless they're admin
  if (req.user.role !== 'Administrators' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
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

    // Prevent non-admins from changing their role
    const updateData = { ...req.body };
    if (req.user.role !== 'Administrators' && updateData.role) {
      delete updateData.role;
    }

    // Hash password if provided
    if (updateData.password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Build update query dynamically
    const fields = Object.keys(updateData).filter(key => key !== 'id');
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(userId);

    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET ${setClause} WHERE id = ?`, values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Return updated user (without password)
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, email, role, created_at, last_login, status, language 
        FROM users WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user language (accessible to the user themselves)
router.patch('/:id/language', authenticateToken, logActivity('user_language_update', 'user'), async (req, res) => {
  const userId = parseInt(req.params.id);
  const { language } = req.body;

  // Users can only update their own language unless they're admin
  if (req.user.role !== 'Administrators' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!language) {
    return res.status(400).json({ error: 'Language is required' });
  }

  // Validate language code (basic validation)
  const validLanguages = ['en', 'fr', 'de', 'es', 'it'];
  if (!validLanguages.includes(language)) {
    return res.status(400).json({ error: 'Invalid language code' });
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

    // Update user language
    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET language = ? WHERE id = ?`, [language, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Return updated user (without password)
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, email, role, created_at, last_login, status, language 
        FROM users WHERE id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user language:', error);
    res.status(500).json({ error: 'Failed to update user language' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, logActivity('user_delete', 'user'), async (req, res) => {
  const userId = parseInt(req.params.id);

  // Prevent admin from deleting themselves
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
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