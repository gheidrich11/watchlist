// SQLite database singleton using better-sqlite3.
// Synchronous, zero ceremony. Tables created on first import.

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ?? path.join(process.cwd(), "dev.db");

const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS bookmark (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    release_year INTEGER,
    status TEXT NOT NULL DEFAULT 'want',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, tmdb_id)
  );

  CREATE INDEX IF NOT EXISTS idx_bookmark_user_status ON bookmark(user_id, status);

  CREATE TABLE IF NOT EXISTS user_service (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    provider_id INTEGER NOT NULL,
    provider_name TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT 'US',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, provider_id, region)
  );

  CREATE TABLE IF NOT EXISTS provider_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    region TEXT NOT NULL DEFAULT 'US',
    provider_data TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tmdb_id, region)
  );

  CREATE INDEX IF NOT EXISTS idx_provider_cache_fetched ON provider_cache(fetched_at);
`);

export default db;
