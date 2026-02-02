const cloudnetApi = require('../services/cloudnetApi');
const { CloudNetError } = require('../utils/errors');

// Cache for CloudNet data when offline
const cache = {
  servers: { data: null, timestamp: null, ttl: 30000 }, // 30 seconds
  nodes: { data: null, timestamp: null, ttl: 30000 },
  services: { data: null, timestamp: null, ttl: 30000 }
};

// CloudNet connection status
let cloudnetStatus = {
  connected: false,
  lastCheck: null,
  lastError: null
};

/**
 * Check if CloudNet is available
 */
const checkCloudNetStatus = async () => {
  try {
    if (!cloudnetApi.config.enabled) {
      cloudnetStatus = {
        connected: false,
        lastCheck: new Date(),
        lastError: 'CloudNet API disabled in configuration'
      };
      return false;
    }

    await cloudnetApi.healthCheck();
    cloudnetStatus = {
      connected: true,
      lastCheck: new Date(),
      lastError: null
    };
    return true;
  } catch (error) {
    cloudnetStatus = {
      connected: false,
      lastCheck: new Date(),
      lastError: error.message
    };
    return false;
  }
};

/**
 * Get cached data if valid
 */
const getCached = (key) => {
  const cached = cache[key];
  if (!cached.data || !cached.timestamp) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > cached.ttl) return null;
  
  return cached.data;
};

/**
 * Set cache data
 */
const setCache = (key, data) => {
  cache[key] = {
    data,
    timestamp: Date.now(),
    ttl: cache[key].ttl
  };
};

/**
 * Middleware to check CloudNet API connectivity with fallback
 */
const requireCloudNetConnection = async (req, res, next) => {
  try {
    // Skip CloudNet check if API is disabled
    if (!cloudnetApi.config.enabled) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'CLOUDNET_DISABLED',
          message: 'CloudNet API is disabled in configuration'
        },
        fallbackMode: true
      });
    }

    // Try to check CloudNet connectivity
    const isConnected = await checkCloudNetStatus();
    
    if (isConnected) {
      // Connected: proceed normally and update cache in background
      req.cloudnetConnected = true;
      next();
    } else {
      // Not connected: check if we have cached data
      const resourceType = req.path.split('/')[1]; // Extract resource type from path
      const cachedData = getCached(resourceType);
      
      if (cachedData) {
        // Return cached data with warning
        return res.json({
          success: true,
          data: cachedData,
          warning: 'CloudNet is currently offline. Showing cached data.',
          fallbackMode: true,
          lastUpdate: cache[resourceType].timestamp,
          cloudnetStatus: cloudnetStatus
        });
      } else {
        // No cached data available
        throw new CloudNetError(
          'CloudNet API not available and no cached data',
          { lastError: cloudnetStatus.lastError }
        );
      }
    }
  } catch (error) {
    if (error instanceof CloudNetError) {
      return res.status(503).json(error.toJSON());
    }
    
    return res.status(503).json({
      success: false,
      error: {
        code: 'CLOUDNET_UNAVAILABLE',
        message: 'CloudNet API not available',
        details: error.message
      },
      cloudnetStatus: cloudnetStatus
    });
  }
};

/**
 * Middleware to check CloudNet but allow proceeding even if offline
 * (for routes that can work without CloudNet)
 */
const checkCloudNetConnectionOptional = async (req, res, next) => {
  try {
    const isConnected = await checkCloudNetStatus();
    req.cloudnetConnected = isConnected;
    req.cloudnetStatus = cloudnetStatus;
    next();
  } catch (error) {
    req.cloudnetConnected = false;
    req.cloudnetStatus = cloudnetStatus;
    next();
  }
};

/**
 * Get current CloudNet status
 */
const getCloudNetStatus = () => {
  return {
    ...cloudnetStatus,
    enabled: cloudnetApi.config.enabled
  };
};

/**
 * Middleware to add CloudNet status to response
 */
const addCloudNetStatusToResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (typeof data === 'object' && data !== null) {
      data.cloudnetStatus = getCloudNetStatus();
    }
    return originalJson(data);
  };
  
  next();
};

// Auto-refresh CloudNet status every 10 seconds
setInterval(() => {
  checkCloudNetStatus().catch(err => {
    console.log('CloudNet status check failed:', err.message);
  });
}, 10000);

// Initial status check
checkCloudNetStatus();

module.exports = {
  requireCloudNetConnection,
  checkCloudNetConnectionOptional,
  getCloudNetStatus,
  addCloudNetStatusToResponse,
  getCached,
  setCache
};