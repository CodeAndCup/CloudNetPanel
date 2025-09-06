const express = require('express');
const cloudnetApi = require('../services/cloudnetApi');

const router = express.Router();

// Health check endpoint to verify CloudNet API connectivity
router.get('/health', async (req, res) => {
  try {
    // If CloudNet is disabled, return a successful response
    if (!cloudnetApi.config.enabled) {
      return res.json({
        connected: true, // Allow the app to function without CloudNet
        enabled: false,
        baseUrl: cloudnetApi.config.baseUrl,
        message: 'CloudNet API is disabled - panel running in mock mode'
      });
    }

    const healthStatus = await cloudnetApi.healthCheck();
    res.json({
      connected: true,
      enabled: cloudnetApi.config.enabled,
      baseUrl: cloudnetApi.config.baseUrl,
      ...healthStatus
    });
  } catch (error) {
    console.error('CloudNet health check error:', error);
    res.status(503).json({
      connected: false,
      enabled: cloudnetApi.config.enabled,
      baseUrl: cloudnetApi.config.baseUrl,
      error: error.message
    });
  }
});

module.exports = router;