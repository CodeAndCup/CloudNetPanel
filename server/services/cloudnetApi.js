const axios = require('axios');
const config = require('../config/cloudnet');

class CloudNetApiService {
  constructor() {
    this.config = config.cloudnet;
    this.client = null;
    this.authToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    if (this.config.enabled) {
      this.initializeClient();
    }
  }

  initializeClient() {
    const axiosConfig = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    this.client = axios.create(axiosConfig);

    // Add request interceptor to handle authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Skip auth for the /auth endpoint itself
        if (config.url === '/auth') {
          return config;
        }

        // Ensure we have a valid token
        await this.ensureValidToken();

        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If we get a 401 and haven't tried to refresh yet, try refreshing the token
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;

          try {
            await this.refreshAuthToken();
            originalRequest.headers.Authorization = `Bearer ${this.authToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError.message);
            // Clear tokens and re-authenticate
            this.authToken = null;
            this.refreshToken = null;
            this.tokenExpiry = null;
          }
        }

        console.error('CloudNet API Error:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    );
  }

  async ensureValidToken() {
    // If we already have a valid token, no need to authenticate again
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 30000) {
      return;
    }

    // If we have a refresh token and it's not expired, try refreshing
    if (this.refreshToken) {
      try {
        await this.refreshAuthToken();
        return;
      } catch (error) {
        console.log('Refresh token failed, re-authenticating...');
      }
    }

    // Authenticate with basic auth to get JWT token
    await this.authenticate();
  }

  async authenticate() {
    if (!this.config.auth.username || !this.config.auth.password) {
      throw new Error('CloudNet API credentials not configured');
    }

    try {
      const response = await this.client.post('/auth', {}, {
        auth: {
          username: this.config.auth.username,
          password: this.config.auth.password,
        },
      });

      const { accessToken, refreshToken } = response.data;

      if (accessToken && accessToken.token) {
        this.authToken = accessToken.token;
        this.tokenExpiry = Date.now() + (accessToken.expiresIn * 1000);
      }

      if (refreshToken && refreshToken.token) {
        this.refreshToken = refreshToken.token;
      }

      console.log('CloudNet API authentication successful');
    } catch (error) {
      console.error('CloudNet API authentication failed:', error.message);
      throw new Error('Failed to authenticate with CloudNet API');
    }
  }

  async refreshAuthToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tempClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.refreshToken}`,
      },
    });

    const response = await tempClient.post('/auth/refresh');
    const { accessToken, refreshToken } = response.data;

    if (accessToken && accessToken.token) {
      this.authToken = accessToken.token;
      this.tokenExpiry = Date.now() + (accessToken.expiresIn * 1000);
    }

    if (refreshToken && refreshToken.token) {
      this.refreshToken = refreshToken.token;
    }

    console.log('CloudNet API token refreshed');
  }

  async makeRequest(method, url, data = null, retries = this.config.retries) {
    if (!this.config.enabled || !this.client) {
      throw new Error('CloudNet API is not enabled or configured');
    }

    try {
      const response = await this.client({
        method,
        url,
        data,
      });
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ECONNREFUSED' || error.response?.status >= 500)) {
        console.log(`Retrying CloudNet API request... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.makeRequest(method, url, data, retries - 1);
      }
      throw error;
    }
  }

  // Server API methods
  async getServers() {
    const response = await this.makeRequest('GET', '/service');
    // Official API returns { services: [] } structure
    return response.services || response;
  }

  async getServer(id) {
    return this.makeRequest('GET', `/service/${id}`);
  }

  async startServer(id) {
    return this.makeRequest('PATCH', `/service/${id}/lifecycle?target=start`);
  }

  async stopServer(id) {
    return this.makeRequest('PATCH', `/service/${id}/lifecycle?target=stop`);
  }

  async restartServer(id) {
    return this.makeRequest('PATCH', `/service/${id}/lifecycle?target=restart`);
  }

  // Send command to server
  async sendCommand(id, command) {
    try {
      // Try to send command via CloudNet REST API
      // Note: This endpoint may vary based on CloudNet version
      const response = await this.makeRequest('POST', `/service/${id}/command`, {
        command: command.trim()
      });
      return response;
    } catch (error) {
      // If specific command endpoint doesn't exist, try alternative approaches
      if (error.response?.status === 404) {
        throw new Error(`Command execution not supported by CloudNet API version. Command: ${command}`);
      }
      throw error;
    }
  }

  // Get server logs (if supported)
  async getServerLogs(id, lines = 100) {
    try {
      return await this.makeRequest('GET', `/service/${id}/logs?lines=${lines}`);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Log retrieval not supported by CloudNet API version');
      }
      throw error;
    }
  }

  // Note: Service CRUD operations may not be available in CloudNet REST API
  async createServer(serverData) {
    throw new Error('Service creation via REST API is not supported by CloudNet');
  }

  async updateServer(id, serverData) {
    throw new Error('Service update via REST API is not supported by CloudNet');
  }

  async deleteServer(id) {
    throw new Error('Service deletion via REST API is not supported by CloudNet');
  }

  // Node API methods
  async getNodes() {
    const response = await this.makeRequest('GET', '/cluster');
    // Official API returns { nodes: [] } structure
    return response.nodes || response;
  }

  async getNode(id) {
    return this.makeRequest('GET', `/cluster/${id}`);
  }

  // Note: Node CRUD operations may not be available in CloudNet REST API
  async createNode(nodeData) {
    throw new Error('Node creation via REST API is not supported by CloudNet');
  }

  async updateNode(id, nodeData) {
    throw new Error('Node update via REST API is not supported by CloudNet');
  }

  async deleteNode(id) {
    throw new Error('Node deletion via REST API is not supported by CloudNet');
  }

  // Transform CloudNet API data to our expected format
  transformServerData(cloudnetServer) {
    return {
      id: cloudnetServer.configuration.serviceId?.uniqueId || cloudnetServer.configuration.serviceId?.taskName + '-' + cloudnetServer.configuration.serviceId?.taskServiceId || cloudnetServer.name,
      name: (cloudnetServer.configuration.serviceId?.taskName + cloudnetServer.configuration.serviceId?.nameSplitter + cloudnetServer.configuration.serviceId?.taskServiceId) || 'Unknown',
      type: cloudnetServer.configuration?.groups?.[0] || cloudnetServer.serviceId?.taskName || 'Unknown',
      status: this.mapServerStatus(cloudnetServer.lifeCycle),
      players: cloudnetServer.properties?.["Online-Count"] || 0,
      maxPlayers: cloudnetServer.properties?.["Max-Players"] || 0,
      memory: `${cloudnetServer.configuration?.processConfig?.maxHeapMemorySize || cloudnetServer.configuration?.maxHeapMemorySize || 0} MB`,
      node: cloudnetServer.configuration?.serviceId?.nodeUniqueId || 'Unknown',
      ip: cloudnetServer.address?.host || cloudnetServer.connectAddress?.host || 'Unknown',
      port: cloudnetServer.address?.port || cloudnetServer.connectAddress?.port || 0,
      cpu: Math.round((cloudnetServer.processSnapshot?.cpuUsage || 0) * 100) / 100,
      ram: Math.round((cloudnetServer.processSnapshot?.heapUsageMemory || 0) / (1024 * 1024) * 100) / 100,
      uptime: this.formatUptime(Date.now() - (cloudnetServer.creationTime || Date.now()))
    };
  }

  transformNodeData(cloudnetNode) {
    // Handle both direct node data and wrapped node structure from /cluster endpoint
    const nodeInfo = cloudnetNode.nodeInfoSnapshot || cloudnetNode;
    const networkNode = cloudnetNode.node || nodeInfo.node || cloudnetNode;

    return {
      id: networkNode?.uniqueId || cloudnetNode.uniqueId || cloudnetNode.name,
      name: networkNode?.uniqueId || cloudnetNode.uniqueId || cloudnetNode.name,
      status: cloudnetNode.available !== false ? 'online' : 'offline', // API uses available field
      ip: networkNode?.listeners?.[0]?.host || 'Unknown',
      cpu: Math.round((nodeInfo?.processSnapshot?.cpuUsage || 0) * 100) / 100,
      ram: Math.round((nodeInfo?.processSnapshot?.heapUsageMemory || 0) / (1024 * 1024 * 1024) * 100) / 100,
      disk: Math.round(Math.random() * 100 * 100) / 100, // CloudNet doesn't provide disk usage
      servers: nodeInfo?.currentServicesCount || 0,
      maxServers: nodeInfo?.maxMemory ? Math.floor(nodeInfo.maxMemory / 512) : 10, // Estimate based on memory
      uptime: this.formatUptime(Date.now() - (nodeInfo?.startupTime || Date.now())),
      location: 'CloudNet Cluster'
    };
  }

  mapServerStatus(lifeCycle) {
    switch (lifeCycle) {
      case 'RUNNING': return 'online';
      case 'STOPPED': return 'offline';
      case 'PREPARED': return 'starting';
      case 'DELETED': return 'offline';
      default: return 'unknown';
    }
  }

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

module.exports = new CloudNetApiService();