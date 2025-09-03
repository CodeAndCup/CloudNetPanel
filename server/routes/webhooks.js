const express = require('express');
const db = require('../database/sqlite');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all webhooks
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  db.all(`
    SELECT w.*, u.username as created_by_username
    FROM webhooks w
    LEFT JOIN users u ON w.created_by = u.id
    ORDER BY w.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching webhooks:', err);
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
    
    // Parse events JSON for each webhook
    const webhooks = rows.map(webhook => ({
      ...webhook,
      events: JSON.parse(webhook.events || '[]')
    }));
    
    res.json(webhooks);
  });
});

// Create a new webhook
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, url, events, active = true } = req.body;
  
  if (!name || !url || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Name, URL, and events array are required' });
  }
  
  const eventsJson = JSON.stringify(events);
  
  db.run(`
    INSERT INTO webhooks (name, url, events, active, created_by)
    VALUES (?, ?, ?, ?, ?)
  `, [name, url, eventsJson, active ? 1 : 0, req.user.id], function(err) {
    if (err) {
      console.error('Error creating webhook:', err);
      return res.status(500).json({ error: 'Failed to create webhook' });
    }
    
    res.status(201).json({
      id: this.lastID,
      message: 'Webhook created successfully'
    });
  });
});

// Update a webhook
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, url, events, active } = req.body;
  
  if (!name || !url || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Name, URL, and events array are required' });
  }
  
  const eventsJson = JSON.stringify(events);
  
  db.run(`
    UPDATE webhooks 
    SET name = ?, url = ?, events = ?, active = ?
    WHERE id = ?
  `, [name, url, eventsJson, active ? 1 : 0, id], function(err) {
    if (err) {
      console.error('Error updating webhook:', err);
      return res.status(500).json({ error: 'Failed to update webhook' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ message: 'Webhook updated successfully' });
  });
});

// Update webhook status (enable/disable)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  
  db.run(`
    UPDATE webhooks 
    SET active = ?
    WHERE id = ?
  `, [active ? 1 : 0, id], function(err) {
    if (err) {
      console.error('Error updating webhook status:', err);
      return res.status(500).json({ error: 'Failed to update webhook status' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ message: 'Webhook status updated successfully' });
  });
});

// Delete a webhook
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM webhooks WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting webhook:', err);
      return res.status(500).json({ error: 'Failed to delete webhook' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ message: 'Webhook deleted successfully' });
  });
});

module.exports = router;