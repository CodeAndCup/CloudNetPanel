const db = require('./sqlite');

// Initialize default groups and permissions
const initializeDefaultData = () => {
  console.log('Initializing default groups and permissions...');

  // Create default groups
  const defaultGroups = [
    { name: 'Administrators', description: 'Full system access' },
    { name: 'Moderators', description: 'Server and template management' },
    { name: 'Developers', description: 'Template and backup access' },
    { name: 'Users', description: 'Basic access to assigned resources' }
  ];

  defaultGroups.forEach(group => {
    db.run(`
      INSERT OR IGNORE INTO groups (name, description)
      VALUES (?, ?)
    `, [group.name, group.description], function(err) {
      if (err) {
        console.error(`Error creating group ${group.name}:`, err);
      } else if (this.changes > 0) {
        console.log(`Created group: ${group.name}`);
        
        // Add default permissions for each group
        if (group.name === 'Administrators') {
          // Admins get full access to everything
          const adminPermissions = [
            { path: '', permission_type: 'read' },
            { path: '', permission_type: 'write' },
            { path: '', permission_type: 'delete' }
          ];
          
          adminPermissions.forEach(perm => {
            db.run(`
              INSERT OR IGNORE INTO file_permissions (path, group_id, permission_type)
              VALUES (?, ?, ?)
            `, [perm.path, this.lastID, perm.permission_type]);
          });
        } else if (group.name === 'Developers') {
          // Developers get template access
          const devPermissions = [
            { path: '', permission_type: 'read' },
            { path: 'spigot', permission_type: 'write' },
            { path: 'paper', permission_type: 'write' }
          ];
          
          devPermissions.forEach(perm => {
            db.run(`
              INSERT OR IGNORE INTO file_permissions (path, group_id, permission_type)
              VALUES (?, ?, ?)
            `, [perm.path, this.lastID, perm.permission_type]);
          });
        }
      }
    });
  });

  // Create some default tasks
  const defaultTasks = [
    {
      name: 'Daily Template Backup',
      description: 'Automated daily backup of all templates',
      type: 'backup',
      schedule: '0 2 * * *', // Daily at 2 AM
      command: 'tar -czf /backups/templates-$(date +%Y%m%d).tar.gz /templates'
    },
    {
      name: 'Weekly System Cleanup',
      description: 'Clean up temporary files and logs',
      type: 'command',
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      command: 'find /tmp -type f -mtime +7 -delete && find /logs -name "*.log" -mtime +30 -delete'
    }
  ];

  defaultTasks.forEach(task => {
    db.run(`
      INSERT OR IGNORE INTO tasks (name, description, type, schedule, command, created_by, status)
      VALUES (?, ?, ?, ?, ?, 1, 'inactive')
    `, [task.name, task.description, task.type, task.schedule, task.command], function(err) {
      if (err) {
        console.error(`Error creating task ${task.name}:`, err);
      } else if (this.changes > 0) {
        console.log(`Created task: ${task.name}`);
      }
    });
  });

  console.log('Default data initialization completed');

  const defaultUsers = [
    {
      name: 'admin',
      mail: 'admin@cloudnet.local',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin'
    }
  ];

  defaultUsers.forEach(user => {
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role, last_login) VALUES (?, ?, ?, ?, ?)
      `, [user.name, user.mail, user.password, user.role, 0], function(err) {
        if(err) {
          console.error(`Error creating user ${user.name}:`, err);
        } else if (this.changes > 0) {
          console.log(`Creating user: ${user.name}`);
        }
      });
  });
};

module.exports = { initializeDefaultData };