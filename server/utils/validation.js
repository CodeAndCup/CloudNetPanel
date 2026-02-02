/**
 * Validation Schemas using Zod
 * Centralized input validation for all API endpoints
 */

const { z } = require('zod');

// ============================================
// User Schemas
// ============================================

const userCreateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['Administrators', 'Users'], {
    errorMap: () => ({ message: 'Role must be either Administrators or Users' })
  })
});

const userUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
  role: z.enum(['Administrators', 'Users']).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// ============================================
// Group Schemas
// ============================================

const groupCreateSchema = z.object({
  name: z.string()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Group name can only contain letters, numbers, spaces, underscores, and hyphens'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
});

const groupUpdateSchema = z.object({
  name: z.string()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Group name can only contain letters, numbers, spaces, underscores, and hyphens')
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// ============================================
// Template Schemas
// ============================================

const templateFileContentSchema = z.object({
  path: z.string()
    .min(1, 'File path is required')
    .max(500, 'File path must be less than 500 characters'),
  content: z.string()
    .max(1048576, 'File content must be less than 1MB')
});

const templateDirectorySchema = z.object({
  path: z.string()
    .min(1, 'Directory path is required')
    .max(500, 'Directory path must be less than 500 characters')
    .regex(/^[a-zA-Z0-9\/_-]+$/, 'Invalid directory path format')
});

const templateFileDeleteSchema = z.object({
  path: z.string()
    .min(1, 'File path is required')
    .max(500, 'File path must be less than 500 characters')
});

// ============================================
// Task Schemas
// ============================================

const taskCreateSchema = z.object({
  name: z.string()
    .min(3, 'Task name must be at least 3 characters')
    .max(100, 'Task name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  type: z.enum(['cron', 'manual', 'webhook'], {
    errorMap: () => ({ message: 'Type must be cron, manual, or webhook' })
  }),
  schedule: z.string()
    .max(100, 'Schedule must be less than 100 characters')
    .optional(),
  command: z.string()
    .min(1, 'Command is required')
    .max(1000, 'Command must be less than 1000 characters')
});

const taskUpdateSchema = z.object({
  name: z.string()
    .min(3, 'Task name must be at least 3 characters')
    .max(100, 'Task name must be less than 100 characters')
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  type: z.enum(['cron', 'manual', 'webhook']).optional(),
  schedule: z.string()
    .max(100, 'Schedule must be less than 100 characters')
    .optional(),
  command: z.string()
    .min(1, 'Command is required')
    .max(1000, 'Command must be less than 1000 characters')
    .optional(),
  enabled: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// ============================================
// Webhook Schemas
// ============================================

const webhookCreateSchema = z.object({
  name: z.string()
    .min(3, 'Webhook name must be at least 3 characters')
    .max(100, 'Webhook name must be less than 100 characters'),
  url: z.string()
    .url('Invalid URL format')
    .max(500, 'URL must be less than 500 characters'),
  events: z.array(z.string()).min(1, 'At least one event must be selected'),
  enabled: z.boolean().optional()
});

const webhookUpdateSchema = z.object({
  name: z.string()
    .min(3, 'Webhook name must be at least 3 characters')
    .max(100, 'Webhook name must be less than 100 characters')
    .optional(),
  url: z.string()
    .url('Invalid URL format')
    .max(500, 'URL must be less than 500 characters')
    .optional(),
  events: z.array(z.string()).min(1, 'At least one event must be selected').optional(),
  enabled: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// ============================================
// Common Schemas
// ============================================

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number')
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a valid number').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a valid number').optional()
});

// ============================================
// Validation Middleware
// ============================================

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = source === 'params' ? req.params : 
                             source === 'query' ? req.query : 
                             req.body;
      
      const validated = schema.parse(dataToValidate);
      
      if (source === 'params') {
        req.params = validated;
      } else if (source === 'query') {
        req.query = validated;
      } else {
        req.body = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      }
      next(error);
    }
  };
};

module.exports = {
  // Schemas
  userCreateSchema,
  userUpdateSchema,
  loginSchema,
  groupCreateSchema,
  groupUpdateSchema,
  templateFileContentSchema,
  templateDirectorySchema,
  templateFileDeleteSchema,
  taskCreateSchema,
  taskUpdateSchema,
  webhookCreateSchema,
  webhookUpdateSchema,
  idParamSchema,
  paginationSchema,
  
  // Middleware
  validate
};
