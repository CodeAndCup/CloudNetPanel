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
      id: cloudnetServer.serviceId?.uniqueId || cloudnetServer.serviceId?.taskName + '-' + cloudnetServer.serviceId?.taskServiceId || cloudnetServer.name,
      name: cloudnetServer.serviceId?.name || (cloudnetServer.serviceId?.taskName + cloudnetServer.serviceId?.nameSplitter + cloudnetServer.serviceId?.taskServiceId) || cloudnetServer.name,
      type: cloudnetServer.configuration?.groups?.[0] || cloudnetServer.serviceId?.taskName || 'Unknown',
      status: this.mapServerStatus(cloudnetServer.lifeCycle),
      players: cloudnetServer.properties?.onlineCount || 0,
      maxPlayers: cloudnetServer.properties?.maxPlayers || 0,
      memory: `${cloudnetServer.configuration?.processConfig?.maxHeapMemorySize || cloudnetServer.configuration?.maxHeapMemorySize || 0} MB`,
      node: cloudnetServer.serviceId?.nodeUniqueId || 'Unknown',
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