const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');
const os = require('os');

const router = express.Router();

// Get system info
router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json({
      totalMemMB: os.totalmem() / 1024 / 1024,
      freeMemMB: os.freemem() / 1024 / 1024,
      cpuCores: os.cpus().length,
      cpuModel: os.cpus()[0].model
    });
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Get total connected players
router.get('/proxyPlayers', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled' });
    }

    // Use CloudNet REST API only
    const totalPlayers = await cloudnetApi.getTotalConnectedPlayers();
    const maxTotalPlayers = await cloudnetApi.getMaxTotalConnectedPlayers();

    res.json({ totalPlayers, maxTotalPlayers });
  } catch (error) {
    console.error('Error fetching total players:', error);
    res.status(500).json({ error: 'Failed to fetch total players from CloudNet API' });
  }
});

module.exports = router;