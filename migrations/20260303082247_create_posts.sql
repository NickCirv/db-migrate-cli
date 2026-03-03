-- Migration: create_posts
-- Created: 2026-03-03T04:22:47.596Z

-- UP

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- DOWN

DROP TABLE posts;
