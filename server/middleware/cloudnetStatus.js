const cloudnetApi = require('../services/cloudnetApi');

// Middleware to check CloudNet API connectivity for protected routes
const requireCloudNetConnection = async (req, res, next) => {
  try {
    // Skip CloudNet check if API is disabled in configuration
    if (!cloudnetApi.config.enabled) {
      return res.status(503).json({
        error: 'CloudNet API is disabled in configuration',
        type: 'cloudnet_disabled'
      });
    }

    // Check CloudNet connectivity
    await cloudnetApi.healthCheck();
    next();
  } catch (error) {
    return res.status(503).json({
      error: 'CloudNet API not available',
      message: error.message,
      type: 'cloudnet_unavailable'
    });
  }
};

module.exports = {
  requireCloudNetConnection
};