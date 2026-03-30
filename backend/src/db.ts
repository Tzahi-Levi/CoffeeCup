import { createClient, Client } from '@libsql/client';

// On Vercel the working directory is read-only; fall back to /tmp which is writable.
// For local development, fall back to a local SQLite file.
const localFallback = process.env['VERCEL'] ? 'file:/tmp/local.db' : 'file:./local.db';

export const db: Client = createClient({
  url: process.env['TURSO_DATABASE_URL'] ?? localFallback,
  authToken: process.env['TURSO_AUTH_TOKEN'],
});

async function addCol(sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch (e: unknown) {
    if (!(e instanceof Error) || !e.message?.includes('duplicate column')) throw e;
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      interval_type TEXT NOT NULL,
      interval_value INTEGER NOT NULL,
      last_completed_at TEXT,
      last_completed_shots INTEGER,
      is_preset INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS brew_logs (
      id TEXT PRIMARY KEY,
      coffee_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      dose_grams REAL NOT NULL,
      grind_level INTEGER NOT NULL,
      brew_time_seconds INTEGER NOT NULL,
      yield_grams REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (coffee_id) REFERENCES coffee_entries(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_brew_logs_coffee_id
    ON brew_logs (coffee_id, created_at DESC)
  `);

  // Additive migrations — add user_id columns if not already present
  await addCol(`ALTER TABLE coffee_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`);
  await addCol(`ALTER TABLE maintenance_tasks ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`);
  await addCol(`ALTER TABLE user_settings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_coffee_entries_user_id
    ON coffee_entries (user_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_user_id
    ON maintenance_tasks (user_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
    ON user_settings (user_id)
  `);
}
