const axios = require('axios');
const config = require('../config/cloudnet');

class CloudNetApiService {
  constructor() {
    this.config = config.cloudnet;
    this.client = null;
    
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

    // Add authentication if configured
    if (this.config.auth.apiKey) {
      axiosConfig.headers['Authorization'] = `Bearer ${this.config.auth.apiKey}`;
    } else if (this.config.auth.username && this.config.auth.password) {
      axiosConfig.auth = {
        username: this.config.auth.username,
        password: this.config.auth.password,
      };
    }

    this.client = axios.create(axiosConfig);

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('CloudNet API Error:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    );
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
      if (retries > 0 && error.code === 'ECONNREFUSED') {
        console.log(`Retrying CloudNet API request... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.makeRequest(method, url, data, retries - 1);
      }
      throw error;
    }
  }

  // Server API methods
  async getServers() {
    return this.makeRequest('GET', '/services');
  }

  async getServer(id) {
    return this.makeRequest('GET', `/services/${id}`);
  }

  async startServer(id) {
    return this.makeRequest('POST', `/services/${id}/start`);
  }

  async stopServer(id) {
    return this.makeRequest('POST', `/services/${id}/stop`);
  }

  async restartServer(id) {
    return this.makeRequest('POST', `/services/${id}/restart`);
  }

  async createServer(serverData) {
    return this.makeRequest('POST', '/services', serverData);
  }

  async updateServer(id, serverData) {
    return this.makeRequest('PUT', `/services/${id}`, serverData);
  }

  async deleteServer(id) {
    return this.makeRequest('DELETE', `/services/${id}`);
  }

  // Node API methods
  async getNodes() {
    return this.makeRequest('GET', '/cluster/nodes');
  }

  async getNode(id) {
    return this.makeRequest('GET', `/cluster/nodes/${id}`);
  }

  async createNode(nodeData) {
    return this.makeRequest('POST', '/cluster/nodes', nodeData);
  }

  async updateNode(id, nodeData) {
    return this.makeRequest('PUT', `/cluster/nodes/${id}`, nodeData);
  }

  async deleteNode(id) {
    return this.makeRequest('DELETE', `/cluster/nodes/${id}`);
  }

  // Transform CloudNet API data to our expected format
  transformServerData(cloudnetServer) {
    return {
      id: cloudnetServer.serviceId?.uniqueId || cloudnetServer.name,
      name: cloudnetServer.serviceId?.name || cloudnetServer.name,
      type: cloudnetServer.configuration?.groups?.[0] || 'Unknown',
      status: this.mapServerStatus(cloudnetServer.lifeCycle),
      players: cloudnetServer.properties?.onlineCount || 0,
      maxPlayers: cloudnetServer.properties?.maxPlayers || 0,
      memory: `${cloudnetServer.configuration?.maxHeapMemorySize || 0} MB`,
      node: cloudnetServer.serviceId?.nodeUniqueId || 'Unknown',
      ip: cloudnetServer.address?.host || 'Unknown',
      port: cloudnetServer.address?.port || 0,
      cpu: Math.round(Math.random() * 100 * 100) / 100, // CloudNet might not provide this
      ram: Math.round((cloudnetServer.processSnapshot?.heapUsageMemory || 0) / (1024 * 1024) * 100) / 100,
      uptime: this.formatUptime(Date.now() - (cloudnetServer.properties?.startupTime || Date.now()))
    };
  }

  transformNodeData(cloudnetNode) {
    return {
      id: cloudnetNode.uniqueId || cloudnetNode.name,
      name: cloudnetNode.info?.name || cloudnetNode.name,
      status: cloudnetNode.available ? 'online' : 'offline',
      ip: cloudnetNode.info?.listeners?.[0]?.host || 'Unknown',
      cpu: Math.round((cloudnetNode.processSnapshot?.cpuUsage || 0) * 100) / 100,
      ram: Math.round((cloudnetNode.processSnapshot?.heapUsageMemory || 0) / (1024 * 1024 * 1024) * 100) / 100,
      disk: Math.round(Math.random() * 100 * 100) / 100, // CloudNet might not provide this
      servers: cloudnetNode.drainModeConfiguration?.services?.length || 0,
      maxServers: cloudnetNode.configuration?.maxServiceCount || 10,
      uptime: this.formatUptime(Date.now() - (cloudnetNode.startupTime || Date.now())),
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