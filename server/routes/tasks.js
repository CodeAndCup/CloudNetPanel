const express = require('express');
const { authenticateToken, requireAdmin, checkTaskPermission } = require('../middleware/auth');
const { validate, taskCreateSchema, taskUpdateSchema, idParamSchema } = require('../utils/validation');
const { asyncHandler, NotFoundError, AuthorizationError, ConflictError } = require('../utils/errors');
const db = require('../database/sqlite');
const cron = require('node-cron');

const router = express.Router();

// Store active cron jobs
const activeCronJobs = new Map();

// Initialize existing scheduled tasks on server start
const initializeScheduledTasks = () => {
  db.all(`
    SELECT * FROM tasks 
    WHERE status = 'active' AND schedule IS NOT NULL
  `, (err, tasks) => {
    if (err) {
      console.error('Error loading scheduled tasks:', err);
      return;
    }

    tasks.forEach(task => {
      if (cron.validate(task.schedule)) {
        const job = cron.schedule(task.schedule, () => executeTask(task), {
          scheduled: true
        });
        activeCronJobs.set(task.id, job);
        console.log(`Scheduled task initialized: ${task.name}`);
      }
    });
  });
};

// Execute a task
const executeTask = async (task) => {
  console.log(`Executing task: ${task.name}`);

  // Update last run time
  db.run(`UPDATE tasks SET last_run = ? WHERE id = ?`, [new Date().toISOString(), task.id]);

  try {
    if (task.type === 'backup') {
      // Execute backup task
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync(task.command);
      console.log(`Backup task completed: ${task.name}`);
    } else if (task.type === 'command') {
      // Execute custom command
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync(task.command);
      console.log(`Command task completed: ${task.name}`);
    }
  } catch (error) {
    console.error('Task execution failed: %s', task.name, error);
  }
};

// Get all tasks
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // Admin can see all tasks, others see only tasks they have permission for
  let query;
  let params;

  if (req.user.role === 'Administrators') {
    query = `
      SELECT t.*, u.username as created_by_username
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `;
    params = [];
  } else {
    query = `
      SELECT DISTINCT t.*, u.username as created_by_username
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN task_permissions tp ON t.id = tp.task_id
      LEFT JOIN user_groups ug ON tp.group_id = ug.group_id
      WHERE t.created_by = ? 
         OR tp.user_id = ? 
         OR ug.user_id = ?
      ORDER BY t.created_at DESC
    `;
    params = [req.user.id, req.user.id, req.user.id];
  }

  const tasks = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  res.json({
    success: true,
    tasks
  });
}));

// Get task by ID
router.get('/:id', authenticateToken, validate(idParamSchema, 'params'), checkTaskPermission('read'), asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.id);

  const task = await new Promise((resolve, reject) => {
    db.get(`
      SELECT t.*, u.username as created_by_username
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `, [taskId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  res.json({
    success: true,
    task
  });
}));

// Create new task
router.post('/', authenticateToken, validate(taskCreateSchema), asyncHandler(async (req, res) => {
  const { name, description, type, schedule, command } = req.body;

  // Validate schedule if provided
  if (schedule && !cron.validate(schedule)) {
    throw new Error('Invalid cron schedule format');
  }

  const taskId = await new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO tasks (name, description, type, schedule, command, status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, 'inactive', ?, ?)
    `, [name, description || '', type, schedule || null, command, req.user.id, new Date().toISOString()], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    task: {
      id: taskId,
      name,
      description: description || '',
      type,
      schedule: schedule || null,
      command,
      status: 'inactive',
      created_by: req.user.id,
      created_at: new Date().toISOString()
    }
  });
}));

// Update task
router.put('/:id', authenticateToken, validate(idParamSchema, 'params'), validate(taskUpdateSchema), checkTaskPermission('write'), asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { name, description, type, schedule, command, enabled } = req.body;

  // Check if task exists
  const existing = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM tasks WHERE id = ?', [taskId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!existing) {
    throw new NotFoundError('Task');
  }

  // Validate schedule if provided
  if (schedule && !cron.validate(schedule)) {
    throw new Error('Invalid cron schedule format');
  }

  // Determine status
  const taskStatus = enabled !== undefined ? (enabled ? 'active' : 'inactive') : undefined;

  // Build update query dynamically based on provided fields
  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (type !== undefined) { updates.push('type = ?'); values.push(type); }
  if (schedule !== undefined) { updates.push('schedule = ?'); values.push(schedule); }
  if (command !== undefined) { updates.push('command = ?'); values.push(command); }
  if (taskStatus !== undefined) { updates.push('status = ?'); values.push(taskStatus); }
  
  values.push(taskId);

  const changes = await new Promise((resolve, reject) => {
    db.run(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });

  if (changes === 0) {
    throw new NotFoundError('Task');
  }

  // Update cron job if task is scheduled
  if (schedule && taskStatus === 'active') {
    if (activeCronJobs.has(taskId)) {
      activeCronJobs.get(taskId).stop();
    }

    const job = cron.schedule(schedule, () => {
      const task = { id: taskId, name, type, command };
      executeTask(task);
    }, { scheduled: true });

    activeCronJobs.set(taskId, job);
  } else if (activeCronJobs.has(taskId)) {
    activeCronJobs.get(taskId).stop();
    activeCronJobs.delete(taskId);
  }

  res.json({ 
    success: true,
    message: 'Task updated successfully' 
  });
}));

// Execute task manually
router.post('/:id/execute', authenticateToken, validate(idParamSchema, 'params'), checkTaskPermission('execute'), asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.id);

  const task = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  // Execute task asynchronously
  executeTask(task);

  res.json({ 
    success: true,
    message: 'Task execution started' 
  });
}));

// Delete task
router.delete('/:id', authenticateToken, validate(idParamSchema, 'params'), checkTaskPermission('write'), asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.id);

  // Stop cron job if active
  if (activeCronJobs.has(taskId)) {
    activeCronJobs.get(taskId).stop();
    activeCronJobs.delete(taskId);
  }

  const changes = await new Promise((resolve, reject) => {
    db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });

  if (changes === 0) {
    throw new NotFoundError('Task');
  }

  res.json({ 
    success: true,
    message: 'Task deleted successfully' 
  });
}));

// Grant task permission to user or group
router.post('/:id/permissions', authenticateToken, requireAdmin, (req, res) => {
  const taskId = parseInt(req.params.id);
  const { userId, groupId, permissionType } = req.body;

  if ((!userId && !groupId) || !permissionType) {
    return res.status(400).json({ error: 'User ID or Group ID and permission type required' });
  }

  if (!['read', 'write', 'execute'].includes(permissionType)) {
    return res.status(400).json({ error: 'Invalid permission type' });
  }

  db.run(`
    INSERT INTO task_permissions (task_id, user_id, group_id, permission_type)
    VALUES (?, ?, ?, ?)
  `, [taskId, userId, groupId, permissionType], function (err) {
    if (err) {
      console.error('Error granting task permission:', err);
      return res.status(500).json({ error: 'Failed to grant permission' });
    }

    res.status(201).json({ message: 'Permission granted successfully' });
  });
});

// Initialize scheduled tasks when module loads
initializeScheduledTasks();

module.exports = router;
