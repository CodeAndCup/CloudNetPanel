const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');

const router = express.Router();

// Mock server data
let servers = [
  {
    id: 1,
    name: 'TestServer-1',
    type: 'Spigot',
    status: 'online',
    players: 5,
    maxPlayers: 20,
    memory: '1024 MB',
    node: 'Node-1',
    ip: '127.0.0.1',
    port: 25565,
    cpu: 25.5,
    ram: 512,
    uptime: '2h 15m'
  },
  {
    id: 2,
    name: 'TestServer-2',
    type: 'Paper',
    status: 'offline',
    players: 0,
    maxPlayers: 50,
    memory: '2048 MB',
    node: 'Node-1',
    ip: '127.0.0.1',
    port: 25566,
    cpu: 0,
    ram: 0,
    uptime: '0m'
  },
  {
    id: 3,
    name: 'TestServer-3',
    type: 'Velocity',
    status: 'starting',
    players: 0,
    maxPlayers: 100,
    memory: '512 MB',
    node: 'Node-2',
    ip: '127.0.0.1',
    port: 25567,
    cpu: 15.2,
    ram: 256,
    uptime: '5m'
  }
];

// Get all servers
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      const cloudnetServers = await cloudnetApi.getServers();
      const transformedServers = cloudnetServers.map(server => 
        cloudnetApi.transformServerData(server)
      );
      res.json(transformedServers);
    } else {
      // Use mock data
      res.json(servers);
    }
  } catch (error) {
    console.error('Error fetching servers:', error);
    
    // Fallback to mock data on API error
    if (config.cloudnet.enabled) {
      console.log('Falling back to mock data due to CloudNet API error');
      res.json(servers);
    } else {
      res.status(500).json({ error: 'Failed to fetch servers' });
    }
  }
});

// Get server by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      const cloudnetServer = await cloudnetApi.getServer(req.params.id);
      const transformedServer = cloudnetApi.transformServerData(cloudnetServer);
      res.json(transformedServer);
    } else {
      // Use mock data
      const server = servers.find(s => s.id === parseInt(req.params.id));
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }
      res.json(server);
    }
  } catch (error) {
    console.error('Error fetching server:', error);
    
    // Fallback to mock data on API error
    if (config.cloudnet.enabled) {
      console.log('Falling back to mock data due to CloudNet API error');
      const server = servers.find(s => s.id === parseInt(req.params.id));
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }
      res.json(server);
    } else {
      res.status(500).json({ error: 'Failed to fetch server' });
    }
  }
});

// Create new server
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, ram, serverType, version, minimumStarted } = req.body;
  
  if (!name || !ram || !serverType || !version || minimumStarted === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create server configuration for CloudNet
    const serverConfig = {
      name,
      memory: ram,
      type: serverType.toLowerCase(),
      version,
      minimumOnlineCount: minimumStarted,
      // Add other CloudNet-specific configuration
      javaCommand: 'java',
      processConfiguration: {
        environment: 'MINECRAFT',
        maxHeapMemorySize: ram,
        jvmOptions: ['-XX:+UseG1GC', '-XX:+UnlockExperimentalVMOptions']
      }
    };

    // Create template and task files in CloudNet directory if path is configured
    const cloudnetPath = process.env.CLOUDNET_SERVER_PATH;
    if (cloudnetPath) {
      const fs = require('fs').promises;
      const path = require('path');
      
      try {
        // Create template directory
        const templatePath = path.join(cloudnetPath, 'local', 'templates', name.toLowerCase());
        await fs.mkdir(templatePath, { recursive: true });
        
        // Create server task configuration
        const taskConfig = {
          name: name,
          runtime: 'jvm',
          environment: 'MINECRAFT',
          autoDeleteOnStop: false,
          staticServices: false,
          deletedFilesAfterStop: [],
          processConfiguration: {
            environment: 'MINECRAFT',
            maxHeapMemorySize: ram,
            jvmOptions: serverConfig.processConfiguration.jvmOptions
          },
          startPort: 44955,
          minServiceCount: minimumStarted,
          templates: [
            {
              prefix: name.toLowerCase(),
              name: 'default',
              storage: 'local'
            }
          ],
          deployments: [],
          groups: ['Global'],
          jvmOptions: serverConfig.processConfiguration.jvmOptions,
          processParameters: []
        };

        // Write task configuration file
        const tasksPath = path.join(cloudnetPath, 'local', 'tasks');
        await fs.mkdir(tasksPath, { recursive: true });
        await fs.writeFile(
          path.join(tasksPath, `${name.toLowerCase()}.json`),
          JSON.stringify(taskConfig, null, 2)
        );

        console.log(`Created template and task configuration for server: ${name}`);
      } catch (fileError) {
        console.warn('Could not create CloudNet files:', fileError.message);
        // Continue with server creation even if file operations fail
      }
    }

    if (config.cloudnet.enabled) {
      // If CloudNet is enabled, create via API
      try {
        await cloudnetApi.createServer(serverConfig);
        res.status(201).json({ 
          message: 'Server creation request sent to CloudNet',
          serverConfig 
        });
      } catch (error) {
        // Fallback to mock creation if CloudNet API fails
        console.warn('CloudNet API creation failed, using mock:', error.message);
        const mockServer = createMockServer(name, serverType, ram);
        res.status(201).json(mockServer);
      }
    } else {
      // Use mock data
      const mockServer = createMockServer(name, serverType, ram);
      res.status(201).json(mockServer);
    }
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

function createMockServer(name, type, memory) {
  const newServer = {
    id: servers.length + 1,
    name,
    type,
    status: 'offline',
    players: 0,
    maxPlayers: 20,
    memory: `${memory}MB`,
    node: 'node-01',
    ip: `192.168.1.${100 + servers.length}`,
    port: 25565 + servers.length,
    cpu: 0,
    ram: 0,
    uptime: '0m'
  };

  servers.push(newServer);
  return newServer;
}

// Update server
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const serverIndex = servers.findIndex(s => s.id === parseInt(req.params.id));
  if (serverIndex === -1) {
    return res.status(404).json({ error: 'Server not found' });
  }

  servers[serverIndex] = { ...servers[serverIndex], ...req.body };
  res.json(servers[serverIndex]);
});

// Delete server
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const serverIndex = servers.findIndex(s => s.id === parseInt(req.params.id));
  if (serverIndex === -1) {
    return res.status(404).json({ error: 'Server not found' });
  }

  servers.splice(serverIndex, 1);
  res.json({ message: 'Server deleted successfully' });
});

// Server actions
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      await cloudnetApi.startServer(req.params.id);
      res.json({ message: 'Server start command sent to CloudNet', serverId: req.params.id });
    } else {
      // Use mock data
      const server = servers.find(s => s.id === parseInt(req.params.id));
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      server.status = 'starting';
      setTimeout(() => {
        server.status = 'online';
        server.uptime = '0m';
      }, 2000);

      res.json({ message: 'Server starting...', server });
    }
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({ error: 'Failed to start server' });
  }
});

router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      await cloudnetApi.stopServer(req.params.id);
      res.json({ message: 'Server stop command sent to CloudNet', serverId: req.params.id });
    } else {
      // Use mock data
      const server = servers.find(s => s.id === parseInt(req.params.id));
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      server.status = 'stopping';
      setTimeout(() => {
        server.status = 'offline';
        server.players = 0;
        server.cpu = 0;
        server.ram = 0;
        server.uptime = '0m';
      }, 2000);

      res.json({ message: 'Server stopping...', server });
    }
  } catch (error) {
    console.error('Error stopping server:', error);
    res.status(500).json({ error: 'Failed to stop server' });
  }
});

router.post('/:id/restart', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      await cloudnetApi.restartServer(req.params.id);
      res.json({ message: 'Server restart command sent to CloudNet', serverId: req.params.id });
    } else {
      // Use mock data
      const server = servers.find(s => s.id === parseInt(req.params.id));
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      server.status = 'restarting';
      setTimeout(() => {
        server.status = 'online';
        server.uptime = '0m';
      }, 3000);

      res.json({ message: 'Server restarting...', server });
    }
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({ error: 'Failed to restart server' });
  }
});

module.exports = router;