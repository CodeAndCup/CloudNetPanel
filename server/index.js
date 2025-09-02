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
const { initializeDefaultData } = require('./database/init');

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

// API routes with appropriate rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/servers', navigationLimiter, serverRoutes);
app.use('/api/nodes', navigationLimiter, nodeRoutes);
app.use('/api/users', navigationLimiter, userRoutes);
app.use('/api/groups', navigationLimiter, groupRoutes);
app.use('/api/templates', navigationLimiter, templateRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/system-info', navigationLimiter, systemRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// WebSocket connection handling for real-time features
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection established');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe_logs':
          // Subscribe to server logs
          ws.serverId = data.serverId;
          ws.send(JSON.stringify({
            type: 'log_subscribed',
            serverId: data.serverId
          }));
          
          // Try to fetch recent logs from CloudNet API
          try {
            if (cloudnetApi.config.enabled) {
              const logs = await cloudnetApi.getServerLogs(data.serverId, 50);
              if (logs && logs.lines) {
                logs.lines.forEach((line, index) => {
                  setTimeout(() => {
                    ws.send(JSON.stringify({
                      type: 'server_log',
                      serverId: data.serverId,
                      timestamp: new Date().toISOString(),
                      message: line
                    }));
                  }, index * 10); // Small delay to avoid flooding
                });
              }
            } else {
              // Send mock logs when CloudNet API is disabled
              const mockLogs = [
                '[INFO] Server started successfully',
                '[INFO] Loading plugins...',
                '[INFO] Server is ready for players',
                '[INFO] Current memory usage: 128MB'
              ];
              mockLogs.forEach((line, index) => {
                setTimeout(() => {
                  ws.send(JSON.stringify({
                    type: 'server_log',
                    serverId: data.serverId,
                    timestamp: new Date().toISOString(),
                    message: line
                  }));
                }, index * 100);
              });
            }
          } catch (error) {
            console.warn('Could not fetch server logs:', error.message);
            // Send a fallback message
            ws.send(JSON.stringify({
              type: 'server_log',
              serverId: data.serverId,
              timestamp: new Date().toISOString(),
              message: '[INFO] Connected to server console (log history unavailable)'
            }));
          }
          break;
          
        case 'send_command':
          // Send command to server via CloudNet API
          if (data.serverId && data.command) {
            try {
              // For CloudNet, we can try to send commands via the REST API
              if (cloudnetApi.config.enabled) {
                const response = await cloudnetApi.sendCommand(data.serverId, data.command);
                
                ws.send(JSON.stringify({
                  type: 'command_sent',
                  serverId: data.serverId,
                  command: data.command,
                  response: response.message || 'Command sent to server',
                  success: true
                }));
              } else {
                // Mock response when CloudNet API is disabled
                ws.send(JSON.stringify({
                  type: 'command_sent',
                  serverId: data.serverId,
                  command: data.command,
                  response: `[MOCK] Command "${data.command}" sent to server ${data.serverId}`,
                  success: true
                }));
              }
              
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
    console.log('CloudNet API is ENABLED - will attempt to use real CloudNet data');
  } else {
    console.log('CloudNet API is DISABLED - will use mock data');
  }
  
  // Initialize default data after server starts
  setTimeout(() => {
    initializeDefaultData();
  }, 1000);
});