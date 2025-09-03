const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/sqlite');

const router = express.Router();

// Get current user's activities
router.get('/my-activity', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const resourceType = req.query.resource_type;
  const days = parseInt(req.query.days) || 30;
  
  let whereClause = 'WHERE user_id = ?';
  let whereParams = [userId];
  
  if (resourceType) {
    whereClause += ' AND resource_type = ?';
    whereParams.push(resourceType);
  }
  
  // Add date filter
  whereClause += ` AND created_at >= datetime('now', '-${days} days')`;

  db.all(`
    SELECT 
      id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    FROM activities
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 100
  `, whereParams, (err, rows) => {
    if (err) {
      console.error('Error fetching user activities:', err);
      return res.status(500).json({ error: 'Failed to fetch activities' });
    }

    // Parse details JSON for each activity
    const activities = rows.map(row => ({
      ...row,
      details: row.details || ''
    }));

    res.json(activities);
  });
});

// Get all activities (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  const userId = req.query.userId;
  const resourceType = req.query.resourceType;
  const action = req.query.action;

  let whereClause = '';
  let whereParams = [];

  // Build WHERE clause based on filters
  const conditions = [];
  if (userId) {
    conditions.push('a.user_id = ?');
    whereParams.push(userId);
  }
  if (resourceType) {
    conditions.push('a.resource_type = ?');
    whereParams.push(resourceType);
  }
  if (action) {
    conditions.push('a.action = ?');
    whereParams.push(action);
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  // Get total count for pagination
  db.get(`
    SELECT COUNT(*) as total
    FROM activities a
    ${whereClause}
  `, whereParams, (err, countResult) => {
    if (err) {
      console.error('Error counting activities:', err);
      return res.status(500).json({ error: 'Failed to count activities' });
    }

    // Get activities with user information
    db.all(`
      SELECT 
        a.id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.details,
        a.ip_address,
        a.created_at,
        u.username,
        u.email,
        u.role
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [...whereParams, limit, offset], (err, rows) => {
      if (err) {
        console.error('Error fetching activities:', err);
        return res.status(500).json({ error: 'Failed to fetch activities' });
      }

      // Parse details JSON for each activity
      const activities = rows.map(row => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : null
      }));

      res.json({
        activities,
        pagination: {
          page,
          limit,
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get activity statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  const timeframe = req.query.timeframe || '7d'; // 1d, 7d, 30d
  
  let dateCondition = '';
  switch (timeframe) {
    case '1d':
      dateCondition = "WHERE created_at >= datetime('now', '-1 day')";
      break;
    case '7d':
      dateCondition = "WHERE created_at >= datetime('now', '-7 days')";
      break;
    case '30d':
      dateCondition = "WHERE created_at >= datetime('now', '-30 days')";
      break;
    default:
      dateCondition = "WHERE created_at >= datetime('now', '-7 days')";
  }

  // Get activities by action type
  db.all(`
    SELECT 
      action,
      COUNT(*) as count
    FROM activities
    ${dateCondition}
    GROUP BY action
    ORDER BY count DESC
  `, (err, actionStats) => {
    if (err) {
      console.error('Error fetching action stats:', err);
      return res.status(500).json({ error: 'Failed to fetch action statistics' });
    }

    // Get activities by resource type
    db.all(`
      SELECT 
        resource_type,
        COUNT(*) as count
      FROM activities
      ${dateCondition}
      GROUP BY resource_type
      ORDER BY count DESC
    `, (err, resourceStats) => {
      if (err) {
        console.error('Error fetching resource stats:', err);
        return res.status(500).json({ error: 'Failed to fetch resource statistics' });
      }

      // Get most active users
      db.all(`
        SELECT 
          u.username,
          u.role,
          COUNT(a.id) as activity_count
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        ${dateCondition}
        GROUP BY a.user_id, u.username, u.role
        ORDER BY activity_count DESC
        LIMIT 10
      `, (err, userStats) => {
        if (err) {
          console.error('Error fetching user stats:', err);
          return res.status(500).json({ error: 'Failed to fetch user statistics' });
        }

        res.json({
          timeframe,
          actionStats,
          resourceStats,
          userStats
        });
      });
    });
  });
});

// Delete old activities (admin only)
router.delete('/cleanup', authenticateToken, requireAdmin, (req, res) => {
  const days = parseInt(req.body.days) || 90; // Default to 90 days
  
  db.run(`
    DELETE FROM activities 
    WHERE created_at < datetime('now', '-${days} days')
  `, (err) => {
    if (err) {
      console.error('Error cleaning up activities:', err);
      return res.status(500).json({ error: 'Failed to cleanup activities' });
    }
    
    res.json({ 
      message: `Successfully cleaned up activities older than ${days} days`,
      deletedDays: days
    });
  });
});

module.exports = router;