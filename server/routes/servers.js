const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');

const router = express.Router();

// Mock server data
let servers = [
  {
    id: 1,
    name: 'Lobby-1',
    type: 'Lobby',
    status: 'online',
    players: 45,
    maxPlayers: 100,
    memory: '2048 MB',
    node: 'Node-1',
    ip: '192.168.1.100',
    port: 25565,
    cpu: 15.2,
    ram: 65.8,
    uptime: '2d 5h 32m'
  },
  {
    id: 2,
    name: 'Survival-1',
    type: 'Survival',
    status: 'online',
    players: 32,
    maxPlayers: 50,
    memory: '4096 MB',
    node: 'Node-2',
    ip: '192.168.1.101',
    port: 25566,
    cpu: 45.7,
    ram: 78.3,
    uptime: '1d 12h 15m'
  },
  {
    id: 3,
    name: 'Creative-1',
    type: 'Creative',
    status: 'offline',
    players: 0,
    maxPlayers: 30,
    memory: '1024 MB',
    node: 'Node-1',
    ip: '192.168.1.102',
    port: 25567,
    cpu: 0,
    ram: 0,
    uptime: '0m'
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
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, type, memory, maxPlayers, node } = req.body;
  
  if (!name || !type || !memory || !maxPlayers || !node) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newServer = {
    id: servers.length + 1,
    name,
    type,
    status: 'offline',
    players: 0,
    maxPlayers,
    memory,
    node,
    ip: `192.168.1.${100 + servers.length}`,
    port: 25565 + servers.length,
    cpu: 0,
    ram: 0,
    uptime: '0m'
  };

  servers.push(newServer);
  res.status(201).json(newServer);
});

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