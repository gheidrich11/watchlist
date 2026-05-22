// Turso (libsql) database client.
// Async, network-backed. Schema auto-initialized on first import.

import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not set");
}
if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN is not set");
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize schema on first connection
async function initSchema() {
  try {
    // Create bookmark table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookmark (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tmdb_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        release_year INTEGER,
        status TEXT NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'watched', 'dismissed')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tmdb_id)
      )
    `, []);

    // Create user_service table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_service (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider_id INTEGER NOT NULL,
        provider_name TEXT NOT NULL,
        region TEXT NOT NULL DEFAULT 'US',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider_id, region)
      )
    `, []);

    // Create provider_cache table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS provider_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL,
        region TEXT NOT NULL DEFAULT 'US',
        provider_data TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tmdb_id, region)
      )
    `, []);
  } catch (err) {
    // Table already exists or other error; in production, log this properly
    console.error("Schema initialization warning:", err);
  }
}

// Initialize on import (fire and forget, but ensure it completes before requests)
let schemaPromise: Promise<void> | null = initSchema();

export async function ensureSchema() {
  if (schemaPromise) {
    await schemaPromise;
    schemaPromise = null;
  }
}

export default db;