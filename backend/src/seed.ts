import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { initDb } from './db';

dotenv.config({ path: resolve(__dirname, '../.env') });

const db = createClient({
  url: process.env['TURSO_DATABASE_URL'] ?? 'file:./local.db',
  authToken: process.env['TURSO_AUTH_TOKEN'],
});

const entries = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Ethiopian Yirgacheffe',
    origin: 'Yirgacheffe, Ethiopia',
    grind_level: 8,
    dose_grams: 18,
    brew_time_seconds: 210,
    notes: 'Bright blueberry and citrus notes with a floral finish. Light roast brings out the natural sweetness.',
    rating: 5,
    roast_level: 'light',
    coffee_type: 'single-origin',
    blend_components: '[]',
    created_at: '2026-03-01T08:00:00.000Z',
    updated_at: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Colombian Supremo',
    origin: 'Huila, Colombia',
    grind_level: 7,
    dose_grams: 20,
    brew_time_seconds: 195,
    notes: 'Classic Colombian profile — caramel, red apple, and a smooth chocolatey body. Reliable morning cup.',
    rating: 4,
    roast_level: 'medium',
    coffee_type: 'single-origin',
    blend_components: '[]',
    created_at: '2026-03-03T09:30:00.000Z',
    updated_at: '2026-03-03T09:30:00.000Z',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Sumatra Mandheling',
    origin: 'Aceh, Sumatra',
    grind_level: 6,
    dose_grams: 19,
    brew_time_seconds: 240,
    notes: 'Earthy, full-bodied with low acidity. Notes of dark chocolate, tobacco, and cedar. Works great as espresso.',
    rating: 4,
    roast_level: 'dark',
    coffee_type: 'single-origin',
    blend_components: '[]',
    created_at: '2026-03-05T14:00:00.000Z',
    updated_at: '2026-03-05T14:00:00.000Z',
  },
  {
    id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
    name: 'Morning Ritual Blend',
    origin: null,
    grind_level: 7,
    dose_grams: 18,
    brew_time_seconds: 185,
    notes: 'My everyday blend — Brazilian base for sweetness, Ethiopian for brightness, a touch of Sumatran for body.',
    rating: 4,
    roast_level: 'medium',
    coffee_type: 'blend',
    blend_components: JSON.stringify([
      { origin: 'Brazil', percentage: 50 },
      { origin: 'Ethiopia', percentage: 30 },
      { origin: 'Sumatra', percentage: 20 },
    ]),
    created_at: '2026-03-10T07:15:00.000Z',
    updated_at: '2026-03-10T07:15:00.000Z',
  },
  {
    id: 'e5f6a7b8-c9d0-1234-ef01-345678901234',
    name: 'Kenya AA Nyeri',
    origin: 'Nyeri, Kenya',
    grind_level: 8,
    dose_grams: 17,
    brew_time_seconds: 180,
    notes: 'Intense blackcurrant and grapefruit acidity. Wine-like body with a lingering caramel sweetness. Exceptional.',
    rating: 5,
    roast_level: 'light',
    coffee_type: 'single-origin',
    blend_components: '[]',
    created_at: '2026-03-15T11:00:00.000Z',
    updated_at: '2026-03-15T11:00:00.000Z',
  },
  {
    id: 'f6a7b8c9-d0e1-2345-f012-456789012345',
    name: 'Guatemala Antigua',
    origin: 'Antigua Valley, Guatemala',
    grind_level: 7,
    dose_grams: 19,
    brew_time_seconds: 200,
    notes: 'Rich chocolate and spice with a hint of smoke. Full body, low acidity. Lovely as a evening pour-over.',
    rating: 4,
    roast_level: 'medium',
    coffee_type: 'single-origin',
    blend_components: '[]',
    created_at: '2026-03-20T16:45:00.000Z',
    updated_at: '2026-03-20T16:45:00.000Z',
  },
  {
    id: 'a7b8c9d0-e1f2-3456-0123-567890123456',
    name: 'Espresso Perfetto',
    origin: null,
    grind_level: 5,
    dose_grams: 22,
    brew_time_seconds: 28,
    notes: 'House espresso blend calibrated for 9-bar pressure. Brazilian and Colombian, medium-dark roast. Crema is gorgeous.',
    rating: 5,
    roast_level: 'medium-dark',
    coffee_type: 'blend',
    blend_components: JSON.stringify([
      { origin: 'Brazil', percentage: 60 },
      { origin: 'Colombia', percentage: 40 },
    ]),
    created_at: '2026-03-22T08:00:00.000Z',
    updated_at: '2026-03-22T08:00:00.000Z',
  },
  {
    id: 'b8c9d0e1-f2a3-4567-1234-678901234567',
    name: 'Costa Rica Tarrazú',
    origin: 'Tarrazú, Costa Rica',
    grind_level: 8,
    dose_grams: 18,
    brew_time_seconds: 190,
    notes: 'Bright honey sweetness with almond and mild citrus. Clean and balanced. Perfect for a light afternoon cup.',
    rating: 4,
    roast_level: 'light',
    coffee_type: 'single-origin',
    blend_components: '[]',
    created_at: '2026-03-25T13:30:00.000Z',
    updated_at: '2026-03-25T13:30:00.000Z',
  },
];

async function seed() {
  console.log(`Initializing database...`);
  await initDb();
  console.log(`Seeding ${entries.length} entries to ${process.env['TURSO_DATABASE_URL']}...`);

  for (const entry of entries) {
    await db.execute({
      sql: `INSERT INTO coffee_entries
        (id, name, origin, grind_level, dose_grams, brew_time_seconds, notes, rating, roast_level, coffee_type, blend_components, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.id,
        entry.name,
        entry.origin,
        entry.grind_level,
        entry.dose_grams,
        entry.brew_time_seconds,
        entry.notes,
        entry.rating,
        entry.roast_level,
        entry.coffee_type,
        entry.blend_components,
        entry.created_at,
        entry.updated_at,
      ],
    });
    console.log(`  ✓ ${entry.name}`);
  }

  console.log('\nSeed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
