const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Mock user data
let users = [];

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  res.json(users.map(user => ({
    ...user,
    password: undefined // Don't send password
  })));
});

// Get user by ID
router.get('/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Users can only view their own profile unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    ...user,
    password: undefined // Don't send password
  });
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { username, email, role } = req.body;
  
  if (!username || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if username or email already exists
  const existingUser = users.find(u => u.username === username || u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const newUser = {
    id: users.length + 1,
    username,
    email,
    role,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    status: 'active'
  };

  users.push(newUser);
  res.status(201).json({
    ...newUser,
    password: undefined
  });
});

// Update user
router.put('/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Users can only update their own profile unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Prevent non-admins from changing their role
  if (req.user.role !== 'admin' && req.body.role) {
    delete req.body.role;
  }

  users[userIndex] = { ...users[userIndex], ...req.body };
  res.json({
    ...users[userIndex],
    password: undefined
  });
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent admin from deleting themselves
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  users.splice(userIndex, 1);
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;