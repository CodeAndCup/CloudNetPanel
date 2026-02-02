-- Migration 001: Add indexes for performance
-- Created: 2026-02-02

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- User groups indexes
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);

-- File permissions indexes
CREATE INDEX IF NOT EXISTS idx_file_permissions_path ON file_permissions(path);
CREATE INDEX IF NOT EXISTS idx_file_permissions_group_id ON file_permissions(group_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);

-- Groups index
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- Optimize database
VACUUM;
ANALYZE;
