const express = require('express');
const cloudnetApi = require('../services/cloudnetApi');

const router = express.Router();

// Health check endpoint to verify CloudNet API connectivity
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await cloudnetApi.healthCheck();
    res.json({
      connected: true,
      enabled: cloudnetApi.config.enabled,
      baseUrl: cloudnetApi.config.baseUrl,
      ...healthStatus
    });
  } catch (error) {
    res.status(503).json({
      connected: false,
      enabled: cloudnetApi.config.enabled,
      baseUrl: cloudnetApi.config.baseUrl,
      error: error.message
    });
  }
});

module.exports = router;