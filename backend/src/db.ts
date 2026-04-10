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

/** Increment (+1) or decrement (-1) the total_shots counter for a user. Never goes below 0.
 *  Uses a user-scoped key `total_shots:{userId}` to avoid the global `key TEXT PRIMARY KEY` conflict.
 *  Falls back to the legacy `total_shots` key as the starting value when the scoped key doesn't exist
 *  yet, so pre-auth shot history is preserved on first brew log after auth migration. */
export async function adjustTotalShots(userId: string, delta: 1 | -1): Promise<void> {
  const scopedKey = `total_shots:${userId}`;
  const result = await db.execute({
    sql: `SELECT value FROM user_settings WHERE key = ?`,
    args: [scopedKey],
  });

  let current: number;
  const rowExists = result.rows.length > 0;

  if (rowExists) {
    current = parseInt((result.rows[0] as Record<string, unknown>)['value'] as string, 10) || 0;
  } else {
    // Scoped key doesn't exist yet — fall back to legacy key so pre-auth data isn't lost
    const legacy = await db.execute({
      sql: `SELECT value FROM user_settings WHERE key = 'total_shots'`,
      args: [],
    });
    current = legacy.rows.length
      ? parseInt((legacy.rows[0] as Record<string, unknown>)['value'] as string, 10) || 0
      : 0;
  }

  const next = Math.max(0, current + delta);
  if (rowExists) {
    await db.execute({
      sql: `UPDATE user_settings SET value = ? WHERE key = ?`,
      args: [String(next), scopedKey],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO user_settings (key, value, user_id) VALUES (?, ?, ?)`,
      args: [scopedKey, String(next), userId],
    });
  }
}
