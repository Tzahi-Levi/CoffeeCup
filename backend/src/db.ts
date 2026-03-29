import { createClient, Client } from '@libsql/client';

// On Vercel the working directory is read-only; fall back to /tmp which is writable.
// For local development, fall back to a local SQLite file.
const localFallback = process.env['VERCEL'] ? 'file:/tmp/local.db' : 'file:./local.db';

export const db: Client = createClient({
  url: process.env['TURSO_DATABASE_URL'] ?? localFallback,
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

  // Seed preset maintenance tasks if table is empty
  const taskCount = await db.execute('SELECT COUNT(*) as count FROM maintenance_tasks');
  if ((taskCount.rows[0] as Record<string, unknown>)['count'] === 0) {
    const now = new Date().toISOString();
    const presets: Array<{ icon: string; name: string; intervalType: string; intervalValue: number; sortOrder: number }> = [
      { icon: '🔄', name: 'Backflush',         intervalType: 'shots', intervalValue: 10,  sortOrder: 0 },
      { icon: '🧪', name: 'Descaling',          intervalType: 'days',  intervalValue: 30,  sortOrder: 1 },
      { icon: '⚙️', name: 'Burr Replacement',   intervalType: 'shots', intervalValue: 500, sortOrder: 2 },
      { icon: '🔧', name: 'Gasket Replacement', intervalType: 'days',  intervalValue: 180, sortOrder: 3 },
      { icon: '🫧', name: 'Deep Clean',          intervalType: 'days',  intervalValue: 7,   sortOrder: 4 },
    ];
    for (const p of presets) {
      await db.execute({
        sql: `INSERT INTO maintenance_tasks
          (id, name, icon, interval_type, interval_value, last_completed_at, last_completed_shots, is_preset, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, ?, ?, ?)`,
        args: [crypto.randomUUID(), p.name, p.icon, p.intervalType, p.intervalValue, p.sortOrder, now, now],
      });
    }
  }

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

  // Seed default total_shots setting if not present
  await db.execute({
    sql: `INSERT OR IGNORE INTO user_settings (key, value) VALUES ('total_shots', '0')`,
    args: [],
  });
}
