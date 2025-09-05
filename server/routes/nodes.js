const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');

const router = express.Router();

// Get all nodes
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled' });
    }

    // Use CloudNet REST API only
    const cloudnetNodes = await cloudnetApi.getNodes();
    const transformedNodes = cloudnetNodes.map(node => 
      cloudnetApi.transformNodeData(node)
    );
    res.json(transformedNodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes from CloudNet API' });
  }
});

// Get node by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled' });
    }

    // Use CloudNet REST API only
    const cloudnetNode = await cloudnetApi.getNode(req.params.id);
    const transformedNode = cloudnetApi.transformNodeData(cloudnetNode);
    res.json(transformedNode);
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({ error: 'Failed to fetch node from CloudNet API' });
  }
});

// Create new node
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  if (!config.cloudnet.enabled) {
    return res.status(503).json({ error: 'CloudNet API is not enabled - node management requires CloudNet' });
  }
  
  // CloudNet doesn't support node creation via REST API
  res.status(501).json({ error: 'Node creation via REST API is not supported by CloudNet' });
});

// Update node
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  if (!config.cloudnet.enabled) {
    return res.status(503).json({ error: 'CloudNet API is not enabled - node management requires CloudNet' });
  }
  
  // CloudNet doesn't support node updates via REST API
  res.status(501).json({ error: 'Node update via REST API is not supported by CloudNet' });
});

// Delete node
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  if (!config.cloudnet.enabled) {
    return res.status(503).json({ error: 'CloudNet API is not enabled - node management requires CloudNet' });
  }
  
  // CloudNet doesn't support node deletion via REST API
  res.status(501).json({ error: 'Node deletion via REST API is not supported by CloudNet' });
});

module.exports = router;