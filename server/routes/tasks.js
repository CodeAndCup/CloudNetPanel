const express = require('express');
const { authenticateToken, requireAdmin, checkTaskPermission } = require('../middleware/auth');
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
    console.error(`Task execution failed: ${task.name}`, error);
  }
};

// Get all tasks
router.get('/', authenticateToken, (req, res) => {
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

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
    res.json(rows);
  });
});

// Get task by ID
router.get('/:id', authenticateToken, checkTaskPermission('read'), (req, res) => {
  const taskId = parseInt(req.params.id);

  db.get(`
    SELECT t.*, u.username as created_by_username
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `, [taskId], (err, row) => {
    if (err) {
      console.error('Error fetching task:', err);
      return res.status(500).json({ error: 'Failed to fetch task' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(row);
  });
});

// Create new task
router.post('/', authenticateToken, (req, res) => {
  const { name, description, type, schedule, command } = req.body;

  if (!name || !type || !command) {
    return res.status(400).json({ error: 'Name, type, and command are required' });
  }

  // Validate schedule if provided
  if (schedule && !cron.validate(schedule)) {
    return res.status(400).json({ error: 'Invalid cron schedule format' });
  }

  db.run(`
    INSERT INTO tasks (name, description, type, schedule, command, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name, description, type, schedule, command, req.user.id], function (err) {
    if (err) {
      console.error('Error creating task:', err);
      return res.status(500).json({ error: 'Failed to create task' });
    }

    const taskId = this.lastID;

    res.status(201).json({
      id: taskId,
      name,
      description,
      type,
      schedule,
      command,
      status: 'inactive',
      created_by: req.user.id,
      created_at: new Date().toISOString()
    });
  });
});

// Update task
router.put('/:id', authenticateToken, checkTaskPermission('write'), (req, res) => {
  const taskId = parseInt(req.params.id);
  const { name, description, type, schedule, command, status } = req.body;

  if (!name || !type || !command) {
    return res.status(400).json({ error: 'Name, type, and command are required' });
  }

  // Validate schedule if provided
  if (schedule && !cron.validate(schedule)) {
    return res.status(400).json({ error: 'Invalid cron schedule format' });
  }

  db.run(`
    UPDATE tasks 
    SET name = ?, description = ?, type = ?, schedule = ?, command = ?, status = ?
    WHERE id = ?
  `, [name, description, type, schedule, command, status || 'inactive', taskId], function (err) {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ error: 'Failed to update task' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update cron job if task is scheduled
    if (schedule && status === 'active') {
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

    res.json({ message: 'Task updated successfully' });
  });
});

// Execute task manually
router.post('/:id/execute', authenticateToken, checkTaskPermission('execute'), async (req, res) => {
  const taskId = parseInt(req.params.id);

  try {
    const task = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Execute task asynchronously
    executeTask(task);

    res.json({ message: 'Task execution started' });
  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({ error: 'Failed to execute task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, checkTaskPermission('write'), (req, res) => {
  const taskId = parseInt(req.params.id);

  // Stop cron job if active
  if (activeCronJobs.has(taskId)) {
    activeCronJobs.get(taskId).stop();
    activeCronJobs.delete(taskId);
  }

  db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], function (err) {
    if (err) {
      console.error('Error deleting task:', err);
      return res.status(500).json({ error: 'Failed to delete task' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  });
});

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