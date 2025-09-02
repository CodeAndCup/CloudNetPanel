const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');
const os = require('os');

const router = express.Router();

// Get all nodes
router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json({
        totalMemMB: os.totalmem() / 1024 / 1024,
        freeMemMB: os.freemem() / 1024 / 1024,
        cpuCores: os.cpus().length,
        cpuModel: os.cpus()[0].model
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    
    // Fallback to mock data on API error
    if (config.cloudnet.enabled) {
      console.log('Falling back to mock data due to CloudNet API error');
      res.json(nodes);
    } else {
      res.status(500).json({ error: 'Failed to fetch nodes' });
    }
  }
});

module.exports = router;