import { createClient, Client } from '@libsql/client';

// On Vercel the working directory is read-only; fall back to /tmp which is writable.
// For local development, fall back to a local SQLite file.
const localFallback = process.env['VERCEL'] ? 'file:/tmp/local.db' : 'file:./local.db';

export const db: Client = createClient({
  url: process.env['TURSO_DATABASE_URL'] ?? localFallback,
  authToken: process.env['TURSO_AUTH_TOKEN'],
});

async function addColumnIfNotExists(columnName: string, columnDef: string): Promise<void> {
  try {
    await db.execute(`ALTER TABLE coffee_entries ADD COLUMN ${columnName} ${columnDef}`);
  } catch {
    // Column already exists — ignore
  }
}

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
  await addColumnIfNotExists('flavor_notes', "TEXT DEFAULT '[]'");
  await addColumnIfNotExists('roasted_at', 'TEXT');
}
