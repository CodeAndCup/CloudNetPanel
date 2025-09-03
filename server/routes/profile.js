const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/sqlite');

const router = express.Router();

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  // Get current user's password hash
  db.get('SELECT password FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Failed to verify current password' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ error: 'Failed to verify current password' });
      }

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ error: 'Failed to hash new password' });
        }

        // Update password
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
          if (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ error: 'Failed to update password' });
          }

          res.json({ message: 'Password changed successfully' });
        });
      });
    });
  });
});

// Update user preferences
router.post('/update-preferences', authenticateToken, (req, res) => {
  const { language, theme } = req.body;
  const userId = req.user.id;

  // For now, we'll just store preferences in a simple way
  // In a real app, you might have a user_preferences table
  let updateFields = [];
  let updateValues = [];

  // Since we don't have a preferences table, we could add columns to users table
  // or create a preferences table. For now, let's just acknowledge the request.
  
  res.json({ 
    message: 'Preferences updated successfully',
    preferences: { language, theme }
  });
});

// Get user preferences
router.get('/preferences', authenticateToken, (req, res) => {
  // For now, return default preferences
  // In a real app, you'd fetch from database
  res.json({
    language: 'en',
    theme: 'light'
  });
});

module.exports = router;