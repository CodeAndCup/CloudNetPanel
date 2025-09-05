const db = require('../database/sqlite');

// Activity logging middleware - for specific actions only
const logActivity = (action, resourceType, options = {}) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    // Check if res.send has already been wrapped by our middleware to prevent duplicates
    if (originalSend._activityLogged) {
      // Skip this middleware application to avoid duplicate logging
      return next();
    }
    
    res.send = function(data) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user ? req.user.id : null;
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Extract resource ID from various sources
        let resourceId = null;
        if (req.params.id) {
          resourceId = req.params.id;
        } else if (req.body && req.body.name) {
          resourceId = req.body.name;
        } else if (req.body && req.body.username) {
          resourceId = req.body.username;
        } else if (req.query && req.query.path) {
          resourceId = req.query.path;
        } else if (options.resourceIdField && req.body[options.resourceIdField]) {
          resourceId = req.body[options.resourceIdField];
        }

        // Create details object with relevant information
        const details = {
          method: req.method,
          path: req.path,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : null,
          query: Object.keys(req.query).length > 0 ? req.query : null
        };

        // Log the activity
        if (userId) {
          db.run(`
            INSERT INTO activities (user_id, action, resource_type, resource_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress], (err) => {
            if (err) {
              console.error('Error logging activity:', err);
            }
          });
        }
      }
      
      originalSend.call(this, data);
    };
    
    // Mark this response as having activity logging applied to prevent duplicate wrapping
    res.send._activityLogged = true;
    
    next();
  };
};

// Simple function to log activity directly (for use in route handlers)
const logActivityDirect = (userId, action, resourceType, resourceId, details, ipAddress) => {
  if (!userId) return;
  
  db.run(`
    INSERT INTO activities (user_id, action, resource_type, resource_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress], (err) => {
    if (err) {
      console.error('Error logging activity:', err);
    }
  });
};

// Sanitize sensitive data from request body before logging
const sanitizeBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

module.exports = { logActivity, logActivityDirect };