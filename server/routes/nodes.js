const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');

const router = express.Router();

// Mock node data
let nodes = [
  {
    id: 1,
    name: 'Node-1',
    status: 'online',
    ip: '192.168.1.10',
    cpu: 25.4,
    ram: 45.8,
    disk: 62.1,
    servers: 2,
    maxServers: 10,
    uptime: '5d 12h 45m',
    location: 'Primary Datacenter'
  },
  {
    id: 2,
    name: 'Node-2',
    status: 'online',
    ip: '192.168.1.11',
    cpu: 67.2,
    ram: 78.9,
    disk: 34.5,
    servers: 1,
    maxServers: 8,
    uptime: '3d 8h 22m',
    location: 'Secondary Datacenter'
  },
  {
    id: 3,
    name: 'Node-3',
    status: 'offline',
    ip: '192.168.1.12',
    cpu: 0,
    ram: 0,
    disk: 0,
    servers: 0,
    maxServers: 12,
    uptime: '0m',
    location: 'Backup Datacenter'
  }
];

// Get all nodes
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      const cloudnetNodes = await cloudnetApi.getNodes();
      const transformedNodes = cloudnetNodes.map(node => 
        cloudnetApi.transformNodeData(node)
      );
      res.json(transformedNodes);
    } else {
      // Use mock data
      res.json(nodes);
    }
  } catch (error) {
    console.error('Error fetching nodes:', error);
    
    // Fallback to mock data on API error
    if (config.cloudnet.enabled) {
      console.log('Falling back to mock data due to CloudNet API error');
      res.json(nodes);
    } else {
      res.status(500).json({ error: 'Failed to fetch nodes' });
    }
  }
});

// Get node by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (config.cloudnet.enabled) {
      // Use CloudNet REST API
      const cloudnetNode = await cloudnetApi.getNode(req.params.id);
      const transformedNode = cloudnetApi.transformNodeData(cloudnetNode);
      res.json(transformedNode);
    } else {
      // Use mock data
      const node = nodes.find(n => n.id === parseInt(req.params.id));
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    }
  } catch (error) {
    console.error('Error fetching node:', error);
    
    // Fallback to mock data on API error
    if (config.cloudnet.enabled) {
      console.log('Falling back to mock data due to CloudNet API error');
      const node = nodes.find(n => n.id === parseInt(req.params.id));
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    } else {
      res.status(500).json({ error: 'Failed to fetch node' });
    }
  }
});

// Create new node
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, ip, maxServers, location } = req.body;
  
  if (!name || !ip || !maxServers || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newNode = {
    id: nodes.length + 1,
    name,
    status: 'offline',
    ip,
    cpu: 0,
    ram: 0,
    disk: 0,
    servers: 0,
    maxServers,
    uptime: '0m',
    location
  };

  nodes.push(newNode);
  res.status(201).json(newNode);
});

// Update node
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const nodeIndex = nodes.findIndex(n => n.id === parseInt(req.params.id));
  if (nodeIndex === -1) {
    return res.status(404).json({ error: 'Node not found' });
  }

  nodes[nodeIndex] = { ...nodes[nodeIndex], ...req.body };
  res.json(nodes[nodeIndex]);
});

// Delete node
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const nodeIndex = nodes.findIndex(n => n.id === parseInt(req.params.id));
  if (nodeIndex === -1) {
    return res.status(404).json({ error: 'Node not found' });
  }

  nodes.splice(nodeIndex, 1);
  res.json({ message: 'Node deleted successfully' });
});

module.exports = router;