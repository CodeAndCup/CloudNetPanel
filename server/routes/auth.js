const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { validate, loginSchema } = require('../utils/validation');
const { asyncHandler, AuthenticationError } = require('../utils/errors');
const db = require('../database/sqlite');

const router = express.Router();

// Rate limiter for login attempts (strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: { 
    success: false,
    error: { 
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes.' 
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Rate limiter for session check (/me endpoint) - very lenient
// GET requests to check current session should not be rate limited aggressively
const sessionCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Allow 60 session checks per minute (1 per second)
  message: { 
    success: false,
    error: { 
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later' 
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Login endpoint with validation and rate limiting
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
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

// Get current user info (with lenient rate limiting)
router.get('/me', sessionCheckLimiter, authenticateToken, (req, res) => {
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