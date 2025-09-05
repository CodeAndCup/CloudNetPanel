require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');

const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const nodeRoutes = require('./routes/nodes');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const templateRoutes = require('./routes/templates');
const backupRoutes = require('./routes/backups');
const taskRoutes = require('./routes/tasks');
const systemRoutes = require('./routes/system')
const activitiesRoutes = require('./routes/activities');
const webhookRoutes = require('./routes/webhooks');
const updatesRoutes = require('./routes/updates');
const cloudnetRoutes = require('./routes/cloudnet');
const { initializeDefaultData } = require('./database/init');
const { logActivity } = require('./middleware/activity');
const { JWT_SECRET } = require('./middleware/auth');
const { requireCloudNetConnection } = require('./middleware/cloudnetStatus');
const jwt = require('jsonwebtoken');
const url = require('url');
const githubUpdateService = require('./services/githubUpdateService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const cloudnetApi = require('./services/cloudnetApi');
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting - More permissive for navigation and authenticated users
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (shorter window)
  max: 300, // Higher limit for general requests
  message: { error: 'Too many requests, please try again later' }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Lower limit for auth attempts
  message: { error: 'Too many authentication attempts, please try again later' }
});

// Very permissive for navigation/info endpoints
const navigationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // High limit for navigation
  skip: (req) => {
    // Skip rate limiting for authenticated admin users
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, require('./middleware/auth').JWT_SECRET);
        return decoded.role === 'Administrators';
      } catch (e) {
        // Token invalid, apply rate limiting
      }
    }
    return false;
  }
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes with appropriate rate limiting (activity logging removed from route level)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/servers', navigationLimiter, requireCloudNetConnection, serverRoutes);
app.use('/api/nodes', navigationLimiter, requireCloudNetConnection, nodeRoutes);
app.use('/api/users', navigationLimiter, userRoutes);
app.use('/api/groups', navigationLimiter, groupRoutes);
app.use('/api/templates', navigationLimiter, templateRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/system-info', navigationLimiter, requireCloudNetConnection, systemRoutes);
app.use('/api/activities', navigationLimiter, activitiesRoutes);
app.use('/api/webhooks', navigationLimiter, webhookRoutes);
app.use('/api/updates', navigationLimiter, updatesRoutes);
app.use('/api/cloudnet', navigationLimiter, cloudnetRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static files from React app
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // Handle React Router - send all non-API requests to index.html
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.log('Client build not found. Run "npm run build" first or use development mode with separate client server.');

  // 404 handler for when no client build exists
  app.use('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.status(404).json({ error: 'Client not built. Run "npm run build" first.' });
  });
}

// Store CloudNet WebSocket connections for each service
const cloudnetConnections = new Map();

// Authenticate WebSocket connections
const authenticateWebSocket = (req) => {
  const query = url.parse(req.url, true).query;
  const token = query.token;

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Create CloudNet WebSocket connection
const createCloudNetWebSocket = async (serviceId, user) => {
  // Only create one connection per service
  if (cloudnetConnections.has(serviceId)) {
    return cloudnetConnections.get(serviceId);
  }

  if (!cloudnetApi.config.enabled) {
    console.log(`CloudNet API disabled - cannot create real WebSocket connection for service ${serviceId}`);
    return null;
  }

  try {
    // Ensure we have a valid CloudNet token
    await cloudnetApi.ensureValidToken();

    if (!cloudnetApi.authToken) {
      throw new Error('No CloudNet authentication token available');
    }

    // Create WebSocket connection to CloudNet liveLog endpoint
    const wsUrl = cloudnetApi.config.baseUrl.replace('http', 'ws') + `/service/${serviceId}/liveLog`;
    const cloudnetWs = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${cloudnetApi.authToken}`
      }
    });

    cloudnetConnections.set(serviceId, {
      socket: cloudnetWs,
      clients: new Set(),
      serviceId: serviceId
    });

    const connection = cloudnetConnections.get(serviceId);

    cloudnetWs.on('open', () => {
      console.log(`Connected to CloudNet WebSocket for service ${serviceId}`);
    });

    cloudnetWs.on('message', (data) => {
      try {
        // Forward messages to all connected clients for this service
        const message = {
          type: 'server_log',
          serverId: serviceId,
          timestamp: new Date().toISOString(),
          message: data.toString()
        };

        connection.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (error) {
        console.error('Error processing CloudNet WebSocket message:', error);
      }
    });

    cloudnetWs.on('close', () => {
      console.log(`CloudNet WebSocket closed for service ${serviceId}`);
      cloudnetConnections.delete(serviceId);
    });

    cloudnetWs.on('error', (error) => {
      console.error(`CloudNet WebSocket error for service ${serviceId}:`, error);
      cloudnetConnections.delete(serviceId);
    });

    return connection;
  } catch (error) {
    console.error(`Failed to create CloudNet WebSocket connection for service ${serviceId}:`, error);
    return null;
  }
};

// WebSocket connection handling for real-time features
wss.on('connection', async (ws, req) => {
  console.log('WebSocket connection attempt...');

  try {
    // Authenticate the WebSocket connection
    const user = authenticateWebSocket(req);
    console.log(`WebSocket authenticated for user: ${user.username}`);

    ws.user = user;
  } catch (error) {
    console.error('WebSocket authentication failed:', error.message);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Authentication failed: ' + error.message
    }));
    ws.close();
    return;
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`WebSocket message received: ${data.type}`);

      switch (data.type) {
        case 'subscribe_logs':
          // Subscribe to server logs
          ws.serverId = data.serverId;
          ws.send(JSON.stringify({
            type: 'log_subscribed',
            serverId: data.serverId
          }));

          // Connect to CloudNet WebSocket or use existing connection
          try {
            if (!cloudnetApi.config.enabled) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'CloudNet API is not enabled - real-time logs unavailable'
              }));
              return;
            }

            const connection = await createCloudNetWebSocket(data.serverId, ws.user);

            if (connection) {
              // Add this client to the connection's client set
              connection.clients.add(ws);

              // Store reference for cleanup
              ws.cloudnetConnection = connection;

              console.log(`Client subscribed to CloudNet WebSocket for service ${data.serverId}`);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Could not connect to CloudNet WebSocket - check CloudNet API connectivity'
              }));
              return;
            }

            // Try to fetch recent logs from CloudNet REST API as history
            const logs = await cloudnetApi.getServerLogs(data.serverId, 20);
            if (logs && logs.lines) {
              logs.lines.forEach((line, index) => {
                setTimeout(() => {
                  ws.send(JSON.stringify({
                    type: 'server_log',
                    serverId: data.serverId,
                    timestamp: new Date().toISOString(),
                    message: line
                  }));
                }, index * 50); // Small delay to avoid flooding
              });
            }
          } catch (error) {
            console.warn('Could not setup server logs:', error.message);
            // Send an error message instead of fallback
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to connect to CloudNet API for real-time logs: ' + error.message
            }));
          }
          break;

        case 'send_command':
          // Send command to server via CloudNet API
          if (data.serverId && data.command) {
            try {
              if (!cloudnetApi.config.enabled) {
                ws.send(JSON.stringify({
                  type: 'command_sent',
                  serverId: data.serverId,
                  command: data.command,
                  response: 'CloudNet API is not enabled - command sending unavailable',
                  success: false
                }));
                return;
              }

              // For CloudNet, we can try to send commands via the REST API
              const response = await cloudnetApi.sendCommand(data.serverId, data.command);

              ws.send(JSON.stringify({
                type: 'command_sent',
                serverId: data.serverId,
                command: data.command,
                response: response.message || 'Command sent to server',
                success: true
              }));

              // Also broadcast the command as a log entry
              ws.send(JSON.stringify({
                type: 'server_log',
                serverId: data.serverId,
                timestamp: new Date().toISOString(),
                message: `> ${data.command}`
              }));

            } catch (error) {
              console.error('Error sending command:', error);
              ws.send(JSON.stringify({
                type: 'command_sent',
                serverId: data.serverId,
                command: data.command,
                response: `Error: ${error.message}`,
                success: false
              }));
            }
          }
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');

    // Clean up CloudNet connection if this was the last client
    if (ws.cloudnetConnection) {
      ws.cloudnetConnection.clients.delete(ws);

      // If no more clients are connected to this service, close the CloudNet connection
      if (ws.cloudnetConnection.clients.size === 0) {
        console.log(`Closing CloudNet WebSocket for service ${ws.cloudnetConnection.serviceId} - no more clients`);
        ws.cloudnetConnection.socket.close();
        cloudnetConnections.delete(ws.cloudnetConnection.serviceId);
      }
    }

    // Clean up any intervals
    if (ws.heartbeatInterval) {
      clearInterval(ws.heartbeatInterval);
    }
  });

  // Send initial connection acknowledgment
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established'
  }));

  // Set up heartbeat to keep connection alive
  ws.heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    }
  }, 30000); // Send heartbeat every 30 seconds
});

// Broadcast logs to subscribed clients (example function)
const broadcastServerLog = (serverId, logLine) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.serverId === serverId) {
      client.send(JSON.stringify({
        type: 'server_log',
        serverId,
        timestamp: new Date().toISOString(),
        message: logLine
      }));
    }
  });
};

server.listen(PORT, () => {
  console.log(`CloudNet Panel server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Log CloudNet API configuration
  const config = require('./config/cloudnet');
  console.log(`CloudNet API Enabled: ${config.cloudnet.enabled}`);
  console.log(`CloudNet API URL: ${config.cloudnet.baseUrl}`);
  if (config.cloudnet.enabled) {
    console.log('CloudNet API is ENABLED - panel will require CloudNet connectivity');
  } else {
    console.log('CloudNet API is DISABLED - panel will not function properly');
  }

  // Initialize default data after server starts
  setTimeout(() => {
    initializeDefaultData();
  }, 1000);

  // Check for updates on startup (non-blocking)
  setTimeout(async () => {
    try {
      console.log('Checking for updates...');
      const updateInfo = await githubUpdateService.getUpdateInfo();

      if (updateInfo.error) {
        console.log(`Update check failed: ${updateInfo.message}`);
      } else if (!updateInfo.upToDate) {
        console.log(`🚀 Update available! Current: ${updateInfo.currentVersion}, Latest: ${updateInfo.latestVersion}`);
        console.log(`📦 Download: ${updateInfo.downloadUrl}`);
      } else {
        console.log(`✅ CloudNet Panel is up to date (${updateInfo.currentVersion})`);
      }
    } catch (error) {
      console.log(`Update check failed: ${error.message}`);
    }
  }, 5000); // Check for updates 5 seconds after startup
});