const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { validate, loginSchema } = require('../utils/validation');
const { asyncHandler, AuthenticationError } = require('../utils/errors');
const db = require('../database/sqlite');

const router = express.Router();

// Login endpoint with validation
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Query user from database
  const user = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) {
        console.error('Database error during login:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Check if user is active
  if (user.status !== 'active') {
    throw new AuthenticationError('Account is disabled');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Generate access token (1 hour expiry)
  const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '1h';
  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: accessTokenExpiry }
  );

  // Generate refresh token (7 days expiry)
  const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: refreshTokenExpiry }
  );

  // Update user last login time
  db.run(
    `UPDATE users SET last_login = ? WHERE id = ?`,
    [new Date().toISOString(), user.id],
    (err) => {
      if (err) console.error('Error updating last login:', err);
    }
  );

  res.json({
    success: true,
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    // Get user from database
    const user = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [decoded.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || user.status !== 'active') {
      throw new AuthenticationError('User not found or inactive');
    }

    // Generate new access token
    const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '1h';
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: accessTokenExpiry }
    );

    res.json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    throw error;
  }
}));

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
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
  // In a production app with refresh tokens in DB, you would invalidate them here
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

module.exports = router;