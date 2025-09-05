const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudnetApi = require('../services/cloudnetApi');
const config = require('../config/cloudnet');

const router = express.Router();

// Get all servers
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled' });
    }

    // Use CloudNet REST API only
    const cloudnetServers = await cloudnetApi.getServers();
    const transformedServers = cloudnetServers.map(server =>
      cloudnetApi.transformServerData(server)
    );
    res.json(transformedServers);

  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers from CloudNet API' });
  }
});

// Get server by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled' });
    }

    // Use CloudNet REST API only
    const cloudnetServer = await cloudnetApi.getServer(req.params.id);
    const transformedServer = cloudnetApi.transformServerData(cloudnetServer);
    res.json(transformedServer);

  } catch (error) {
    console.error('Error fetching server:', error);
    res.status(500).json({ error: 'Failed to fetch server from CloudNet API' });
  }
});

router.get('/:id/cachedLogs', authenticateToken, async (req, res) => {
  const serverId = req.params.id;

  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled' });
    }

    const logs = await cloudnetApi.getCachedLogs(serverId);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching cached logs:', error);
    res.status(500).json({ error: 'Failed to fetch cached logs from CloudNet API' });
  }
});

// Create new server
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, ram, serverType, version, minimumStarted } = req.body;

  if (!name || !ram || !serverType || !version || minimumStarted === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!config.cloudnet.enabled) {
    return res.status(503).json({ error: 'CloudNet API is not enabled - server creation requires CloudNet' });
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

    // Create via CloudNet API only
    await cloudnetApi.createServer(serverConfig);
    res.status(201).json({
      message: 'Server creation request sent to CloudNet',
      serverConfig
    });
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server via CloudNet API' });
  }
});

// Update server
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  if (!config.cloudnet.enabled) {
    return res.status(503).json({ error: 'CloudNet API is not enabled - server management requires CloudNet' });
  }
  
  // CloudNet doesn't support server updates via REST API
  res.status(501).json({ error: 'Server update via REST API is not supported by CloudNet' });
});

// Delete server
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  if (!config.cloudnet.enabled) {
    return res.status(503).json({ error: 'CloudNet API is not enabled - server management requires CloudNet' });
  }
  
  // CloudNet doesn't support server deletion via REST API
  res.status(501).json({ error: 'Server deletion via REST API is not supported by CloudNet' });
});

// Server actions
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled - server control requires CloudNet' });
    }

    // Use CloudNet REST API only
    await cloudnetApi.startServer(req.params.id);
    res.json({ message: 'Server start command sent to CloudNet', serverId: req.params.id });
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({ error: 'Failed to start server via CloudNet API' });
  }
});

router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled - server control requires CloudNet' });
    }

    // Use CloudNet REST API only
    await cloudnetApi.stopServer(req.params.id);
    res.json({ message: 'Server stop command sent to CloudNet', serverId: req.params.id });
  } catch (error) {
    console.error('Error stopping server:', error);
    res.status(500).json({ error: 'Failed to stop server via CloudNet API' });
  }
});

router.post('/:id/restart', authenticateToken, async (req, res) => {
  try {
    if (!config.cloudnet.enabled) {
      return res.status(503).json({ error: 'CloudNet API is not enabled - server control requires CloudNet' });
    }

    // Use CloudNet REST API only
    await cloudnetApi.restartServer(req.params.id);
    res.json({ message: 'Server restart command sent to CloudNet', serverId: req.params.id });
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({ error: 'Failed to restart server via CloudNet API' });
  }
});

module.exports = router;