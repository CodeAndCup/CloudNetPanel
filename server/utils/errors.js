/**
 * Custom Error Classes
 * Standardized error handling across the application
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      status: this.statusCode,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details })
      },
      timestamp: new Date().toISOString()
    };
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class CloudNetError extends AppError {
  constructor(message = 'CloudNet API error', details = null) {
    super(message, 502, 'CLOUDNET_ERROR', details);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error (will be replaced with proper logger later)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode
    });
  } else {
    console.error('Error:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode
    });
  }

  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Zod validation errors (if they slip through)
  if (err.name === 'ZodError') {
    const validationError = new ValidationError('Invalid input data', 
      err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    );
    return res.status(validationError.statusCode).json(validationError.toJSON());
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const authError = new AuthenticationError('Invalid token');
    return res.status(authError.statusCode).json(authError.toJSON());
  }

  if (err.name === 'TokenExpiredError') {
    const authError = new AuthenticationError('Token expired');
    return res.status(authError.statusCode).json(authError.toJSON());
  }

  // Handle SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    const dbError = new ConflictError('Database constraint violation');
    return res.status(dbError.statusCode).json(dbError.toJSON());
  }

  if (err.code && err.code.startsWith('SQLITE_')) {
    const dbError = new DatabaseError('Database operation failed');
    return res.status(dbError.statusCode).json(dbError.toJSON());
  }

  // Handle unknown errors
  const response = {
    success: false,
    status: 500,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    },
    timestamp: new Date().toISOString()
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  return res.status(500).json(response);
};

/**
 * 404 Handler Middleware
 */
const notFoundHandler = (req, res) => {
  const error = new NotFoundError('Route');
  res.status(error.statusCode).json(error.toJSON());
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  CloudNetError,
  DatabaseError,
  RateLimitError,
  ConflictError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler
};
