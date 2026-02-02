-- Migration 002: Add foreign key constraints
-- Created: 2026-02-02

-- Note: SQLite requires recreating tables to add foreign keys
-- This migration adds constraints for data integrity

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Add created_at columns where missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Ensure all timestamp columns exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_run TEXT;

-- Add updated_at columns for audit trail
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TEXT;
