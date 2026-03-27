import { createClient, Client } from '@libsql/client';

export const db: Client = createClient({
  url: process.env['TURSO_DATABASE_URL'] ?? 'file:./local.db',
  authToken: process.env['TURSO_AUTH_TOKEN'],
});

export async function initDb(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS coffee_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      origin TEXT,
      grind_level INTEGER NOT NULL,
      dose_grams REAL NOT NULL,
      brew_time_seconds INTEGER NOT NULL,
      notes TEXT,
      rating INTEGER,
      roast_level TEXT,
      coffee_type TEXT,
      blend_components TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_coffee_entries_created_at
    ON coffee_entries (created_at DESC)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_coffee_entries_name
    ON coffee_entries (name)
  `);
}
