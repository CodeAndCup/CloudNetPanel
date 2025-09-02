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
  
  ws.on('message', (message) => {
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
          break;
          
        case 'send_command':
          // Send command to server
          if (data.serverId && data.command) {
            // TODO: Implement actual command sending
            ws.send(JSON.stringify({
              type: 'command_sent',
              serverId: data.serverId,
              command: data.command,
              response: 'Command executed successfully'
            }));
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
  });

  // Send initial connection acknowledgment
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established'
  }));
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