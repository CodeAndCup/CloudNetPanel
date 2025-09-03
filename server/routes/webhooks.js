const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/sqlite');

const router = express.Router();

// Get all webhooks
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  db.all(`
    SELECT id, name, url, events, active, created_at, last_triggered
    FROM webhooks 
    ORDER BY created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching webhooks:', err);
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
    
    // Parse events JSON for each webhook
    const webhooks = rows.map(webhook => ({
      ...webhook,
      events: JSON.parse(webhook.events || '[]'),
      active: Boolean(webhook.active)
    }));
    
    res.json(webhooks);
  });
});

// Get a specific webhook
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const webhookId = parseInt(req.params.id);
  
  db.get(`
    SELECT id, name, url, events, active, created_at, last_triggered
    FROM webhooks 
    WHERE id = ?
  `, [webhookId], (err, webhook) => {
    if (err) {
      console.error('Error fetching webhook:', err);
      return res.status(500).json({ error: 'Failed to fetch webhook' });
    }
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Parse events JSON
    webhook.events = JSON.parse(webhook.events || '[]');
    webhook.active = Boolean(webhook.active);
    
    res.json(webhook);
  });
});

// Create a new webhook
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, url, events, active = true } = req.body;
  
  if (!name || !url || !events) {
    return res.status(400).json({ error: 'Name, URL, and events are required' });
  }
  
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'Events must be an array' });
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  db.run(`
    INSERT INTO webhooks (name, url, events, active)
    VALUES (?, ?, ?, ?)
  `, [name, url, JSON.stringify(events), active ? 1 : 0], function(err) {
    if (err) {
      console.error('Error creating webhook:', err);
      return res.status(500).json({ error: 'Failed to create webhook' });
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      url,
      events,
      active,
      created_at: new Date().toISOString(),
      last_triggered: null
    });
  });
});

// Update a webhook
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const webhookId = parseInt(req.params.id);
  const { name, url, events, active } = req.body;
  
  if (!name || !url || !events) {
    return res.status(400).json({ error: 'Name, URL, and events are required' });
  }
  
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: 'Events must be an array' });
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  db.run(`
    UPDATE webhooks 
    SET name = ?, url = ?, events = ?, active = ?
    WHERE id = ?
  `, [name, url, JSON.stringify(events), active ? 1 : 0, webhookId], function(err) {
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

// Toggle webhook active status
router.patch('/:id/toggle', authenticateToken, requireAdmin, (req, res) => {
  const webhookId = parseInt(req.params.id);
  const { active } = req.body;
  
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Active status must be a boolean' });
  }
  
  db.run(`
    UPDATE webhooks 
    SET active = ?
    WHERE id = ?
  `, [active ? 1 : 0, webhookId], function(err) {
    if (err) {
      console.error('Error toggling webhook:', err);
      return res.status(500).json({ error: 'Failed to toggle webhook' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ message: 'Webhook status updated successfully' });
  });
});

// Delete a webhook
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const webhookId = parseInt(req.params.id);
  
  db.run(`DELETE FROM webhooks WHERE id = ?`, [webhookId], function(err) {
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