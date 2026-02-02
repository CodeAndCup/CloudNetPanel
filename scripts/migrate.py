"""
Database Migration System for CloudNet Panel
Simple SQL-based migrations with version tracking
"""

import sqlite3
import os
import sys
from datetime import datetime

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'migrations')
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'server', 'database', 'cloudnet_panel.db')

def init_migrations_table(conn):
    """Create migrations tracking table if it doesn't exist"""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )
    """)
    conn.commit()

def get_applied_migrations(conn):
    """Get list of applied migrations"""
    cursor = conn.execute("SELECT version FROM migrations ORDER BY version")
    return [row[0] for row in cursor.fetchall()]

def get_available_migrations():
    """Get list of available migration files"""
    if not os.path.exists(MIGRATIONS_DIR):
        os.makedirs(MIGRATIONS_DIR)
        return []
    
    migrations = []
    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if filename.endswith('.sql') and filename.startswith('0'):
            version = filename.split('_')[0]
            name = filename.replace('.sql', '')
            migrations.append((version, name, filename))
    return migrations

def apply_migration(conn, version, name, filepath):
    """Apply a single migration"""
    print(f"Applying migration {version}: {name}...")
    
    with open(filepath, 'r') as f:
        sql = f.read()
    
    try:
        conn.executescript(sql)
        conn.execute(
            "INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)",
            (version, name, datetime.now().isoformat())
        )
        conn.commit()
        print(f"✅ Migration {version} applied successfully")
        return True
    except Exception as e:
        print(f"❌ Error applying migration {version}: {e}")
        conn.rollback()
        return False

def migrate():
    """Run pending migrations"""
    conn = sqlite3.connect(DB_PATH)
    
    try:
        init_migrations_table(conn)
        applied = get_applied_migrations(conn)
        available = get_available_migrations()
        
        pending = [m for m in available if m[0] not in applied]
        
        if not pending:
            print("✅ No pending migrations")
            return True
        
        print(f"Found {len(pending)} pending migration(s)")
        
        for version, name, filename in pending:
            filepath = os.path.join(MIGRATIONS_DIR, filename)
            if not apply_migration(conn, version, name, filepath):
                return False
        
        print(f"\n✅ All migrations applied successfully")
        return True
        
    finally:
        conn.close()

if __name__ == '__main__':
    success = migrate()
    sys.exit(0 if success else 1)
