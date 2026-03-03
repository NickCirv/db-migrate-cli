-- Migration: add_users_table
-- Created: 2026-03-03T04:22:47.596Z

-- UP

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- DOWN

DROP TABLE users;
