const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../middleware/activity');
const { validate, groupCreateSchema, groupUpdateSchema, idParamSchema } = require('../utils/validation');
const { asyncHandler, NotFoundError, ConflictError } = require('../utils/errors');
const db = require('../database/sqlite');

const router = express.Router();

// Get all groups
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const groups = await new Promise((resolve, reject) => {
    db.all(`
      SELECT g.*, 
             COUNT(ug.user_id) as user_count
      FROM groups g
      LEFT JOIN user_groups ug ON g.id = ug.group_id
      GROUP BY g.id
      ORDER BY g.name
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  res.json({
    success: true,
    groups
  });
}));

// Get group by ID with users
router.get('/:id', authenticateToken, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
  const groupId = parseInt(req.params.id);
  
  const group = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM groups WHERE id = ?`, [groupId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!group) {
    throw new NotFoundError('Group');
  }

  // Get users in this group
  const users = await new Promise((resolve, reject) => {
    db.all(`
      SELECT u.id, u.username, u.email, u.role, u.status
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ?
    `, [groupId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  res.json({
    success: true,
    group: { ...group, users }
  });
}));

// Create new group (admin only)
router.post('/', 
  authenticateToken, 
  requireAdmin,
  validate(groupCreateSchema),
  logActivity('group_create', 'group', { resourceIdField: 'name' }),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // Check if group name already exists
    const existing = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM groups WHERE name = ?`, [name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      throw new ConflictError('Group name already exists');
    }

    const groupId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO groups (name, description, created_at)
        VALUES (?, ?, ?)
      `, [name, description || '', new Date().toISOString()], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: {
        id: groupId,
        name,
        description: description || '',
        created_at: new Date().toISOString()
      }
    });
  })
);

// Update group (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(groupUpdateSchema),
  logActivity('group_update', 'group'),
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id);
    const { name, description } = req.body;

    // Check if group exists
    const existing = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM groups WHERE id = ?`, [groupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existing) {
      throw new NotFoundError('Group');
    }

    // Check if new name conflicts with another group
    if (name) {
      const nameConflict = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM groups WHERE name = ? AND id != ?`, [name, groupId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (nameConflict) {
        throw new ConflictError('Group name already exists');
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(groupId);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE groups SET ${updates.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Group updated successfully'
    });
  })
);

// Delete group (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  logActivity('group_delete', 'group'),
  asyncHandler(async (req, res) => {
    const groupId = parseInt(req.params.id);

    // Check if group exists
    const existing = await new Promise((resolve, reject) => {
      db.get(`SELECT name FROM groups WHERE id = ?`, [groupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existing) {
      throw new NotFoundError('Group');
    }

    // Delete group
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM groups WHERE id = ?`, [groupId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Clean up user_groups relationships
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM user_groups WHERE group_id = ?`, [groupId], (err) => {
        if (err) console.error('Error deleting user_groups:', err);
        resolve();
      });
    });

    res.json({
      success: true,
      message: `Group ${existing.name} deleted successfully`
    });
  })
);

// Add user to group (admin only)
router.post('/:id/users', authenticateToken, requireAdmin, logActivity('group_add_user', 'group'), asyncHandler(async (req, res) => {
  const groupId = parseInt(req.params.id);
  const { userId } = req.body;

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO user_groups (user_id, group_id)
        VALUES (?, ?)
      `, [userId, groupId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(201).json({ 
      success: true,
      message: 'User added to group successfully' 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new ConflictError('User is already in this group');
    }
    throw err;
  }
}));

// Remove user from group (admin only)
router.delete('/:id/users/:userId', authenticateToken, requireAdmin, validate(idParamSchema, 'params'), logActivity('group_remove_user', 'group'), asyncHandler(async (req, res) => {
  const groupId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  
  const changes = await new Promise((resolve, reject) => {
    db.run(`
      DELETE FROM user_groups 
      WHERE user_id = ? AND group_id = ?
    `, [userId, groupId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });

  if (changes === 0) {
    throw new NotFoundError('User not found in group');
  }

  res.json({ 
    success: true,
    message: 'User removed from group successfully' 
  });
}));

module.exports = router;