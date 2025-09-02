const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/sqlite');

const router = express.Router();

// Get all groups
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT g.*, 
           COUNT(u.id) as user_count
    FROM groups g
    LEFT JOIN users u ON g.name = u.role
    GROUP BY g.id
    ORDER BY g.name
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching groups:', err);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }
    res.json(rows);
  });
});

// Get group by ID with users
router.get('/:id', authenticateToken, (req, res) => {
  const groupId = parseInt(req.params.id);
  
  db.get(`SELECT * FROM groups WHERE id = ?`, [groupId], (err, group) => {
    if (err) {
      console.error('Error fetching group:', err);
      return res.status(500).json({ error: 'Failed to fetch group' });
    }
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get users in this group
    db.all(`
      SELECT u.id, u.username, u.email, u.role, u.status
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ?
    `, [groupId], (err, users) => {
      if (err) {
        console.error('Error fetching group users:', err);
        return res.status(500).json({ error: 'Failed to fetch group users' });
      }
      
      res.json({ ...group, users });
    });
  });
});

// Create new group (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  db.run(`
    INSERT INTO groups (name, description)
    VALUES (?, ?)
  `, [name, description], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Group name already exists' });
      }
      console.error('Error creating group:', err);
      return res.status(500).json({ error: 'Failed to create group' });
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      description,
      created_at: new Date().toISOString()
    });
  });
});

// Update group (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const groupId = parseInt(req.params.id);
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  db.run(`
    UPDATE groups 
    SET name = ?, description = ?
    WHERE id = ?
  `, [name, description, groupId], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Group name already exists' });
      }
      console.error('Error updating group:', err);
      return res.status(500).json({ error: 'Failed to update group' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({ message: 'Group updated successfully' });
  });
});

// Delete group (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const groupId = parseInt(req.params.id);
  
  db.run(`DELETE FROM groups WHERE id = ?`, [groupId], function(err) {
    if (err) {
      console.error('Error deleting group:', err);
      return res.status(500).json({ error: 'Failed to delete group' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({ message: 'Group deleted successfully' });
  });
});

// Add user to group (admin only)
router.post('/:id/users', authenticateToken, requireAdmin, (req, res) => {
  const groupId = parseInt(req.params.id);
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  db.run(`
    INSERT INTO user_groups (user_id, group_id)
    VALUES (?, ?)
  `, [userId, groupId], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'User is already in this group' });
      }
      console.error('Error adding user to group:', err);
      return res.status(500).json({ error: 'Failed to add user to group' });
    }
    
    res.status(201).json({ message: 'User added to group successfully' });
  });
});

// Remove user from group (admin only)
router.delete('/:id/users/:userId', authenticateToken, requireAdmin, (req, res) => {
  const groupId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);
  
  db.run(`
    DELETE FROM user_groups 
    WHERE user_id = ? AND group_id = ?
  `, [userId, groupId], function(err) {
    if (err) {
      console.error('Error removing user from group:', err);
      return res.status(500).json({ error: 'Failed to remove user from group' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found in group' });
    }
    
    res.json({ message: 'User removed from group successfully' });
  });
});

module.exports = router;