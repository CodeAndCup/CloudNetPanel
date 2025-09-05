// CloudNet REST API Configuration
const config = {
  cloudnet: {
    // Set to true to use CloudNet REST API, false to use mock data
    enabled: process.env.CLOUDNET_API_ENABLED === 'true' || false,

    // CloudNet REST API base URL
    baseUrl: process.env.CLOUDNET_API_URL || 'http://localhost:8080/api/v3',

    // Authentication settings (if required)
    auth: {
      // API key or token if CloudNet API requires authentication
      apiKey: process.env.CLOUDNET_API_KEY || null,

      // Basic auth credentials if required
      username: process.env.CLOUDNET_API_USERNAME || null,
      password: process.env.CLOUDNET_API_PASSWORD || null
    },

    // Request timeout in milliseconds
    timeout: parseInt(process.env.CLOUDNET_API_TIMEOUT) || 5000,

    // Retry settings
    retries: parseInt(process.env.CLOUDNET_API_RETRIES) || 3,
    retryDelay: parseInt(process.env.CLOUDNET_API_RETRY_DELAY) || 1000,

    // CloudNet Server Path
    serverPath: process.env.CLOUDNET_SERVER_PATH || '/home/cloudnet/CloudNet-Server',

    // Proxy group configuration
    proxyGroup: process.env.CLOUDNET_SERVER_PROXY_GROUP || 'Global-Proxy'
  }
};

module.exports = config;