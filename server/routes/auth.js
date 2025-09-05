const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const db = require('../database/sqlite');
const cloudnetApi = require('../services/cloudnetApi');

const router = express.Router();

// Default admin user (should be changed on first login)
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@cloudnet.local',
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
  role: 'admin'
};
// If user table empty do:
// sqlite3 server/database/cloudnet.db  "INSERT INTO users VALUES (1,'admin','admin@cloudnet.local','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin',1,1,null)"

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // First check CloudNet API connectivity
    try {
      await cloudnetApi.healthCheck();
    } catch (error) {
      return res.status(503).json({ 
        error: 'CloudNet API not available',
        message: error.message,
        type: 'cloudnet_unavailable'
      });
    }

    let user = null;

    user = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
          console.error('Error fetching user: ', err);
          reject(err)
        }

        if (!row) reject(new Error('User not found'));

        resolve(row)
      });
    });

    // For demo purposes, use default admin
    // In production, this would query the database
    /*if (username === DEFAULT_ADMIN.username) {
      user = DEFAULT_ADMIN;
    }*/

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id || 1,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id || 1,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
  // In a production app, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;