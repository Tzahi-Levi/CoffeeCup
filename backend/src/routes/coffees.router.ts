import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Map DB row (snake_case) to CoffeeEntry (camelCase)
function rowToEntry(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    name: row['name'],
    origin: row['origin'] ?? null,
    grindLevel: row['grind_level'],
    doseGrams: row['dose_grams'],
    brewTimeSeconds: row['brew_time_seconds'],
    notes: row['notes'] ?? null,
    rating: row['rating'] ?? null,
    roastLevel: row['roast_level'] ?? null,
    coffeeType: row['coffee_type'] ?? null,
    blendComponents: row['blend_components']
      ? JSON.parse(row['blend_components'] as string)
      : [],
    flavorNotes: row['flavor_notes']
      ? JSON.parse(row['flavor_notes'] as string)
      : [],
    roastedAt: row['roasted_at'] ?? null,
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

// GET /api/v1/coffees
router.get('/', async (_req: Request, res: Response) => {
  const result = await db.execute(
    'SELECT * FROM coffee_entries ORDER BY created_at DESC'
  );
  res.json({ data: result.rows.map(rowToEntry) });
});

// POST /api/v1/coffees
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (!body['name'] || body['grindLevel'] == null || body['doseGrams'] == null || body['brewTimeSeconds'] == null) {
    res.status(400).json({ error: 'Missing required fields: name, grindLevel, doseGrams, brewTimeSeconds' });
    return;
  }
  const now = new Date().toISOString();
  const id = (body['id'] as string) ?? crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO coffee_entries
      (id, name, origin, grind_level, dose_grams, brew_time_seconds, notes, rating, roast_level, coffee_type, blend_components, flavor_notes, roasted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      body['name'] as string,
      (body['origin'] as string | null) ?? null,
      body['grindLevel'] as number,
      body['doseGrams'] as number,
      body['brewTimeSeconds'] as number,
      (body['notes'] as string | null) ?? null,
      (body['rating'] as number | null) ?? null,
      (body['roastLevel'] as string | null) ?? null,
      (body['coffeeType'] as string | null) ?? null,
      body['blendComponents'] ? JSON.stringify(body['blendComponents']) : '[]',
      body['flavorNotes'] ? JSON.stringify(body['flavorNotes']) : '[]',
      (body['roastedAt'] as string | null) ?? null,
      now,
      now,
    ],
  });
  const created = await db.execute({ sql: 'SELECT * FROM coffee_entries WHERE id = ?', args: [id] });
  res.status(201).json({ data: rowToEntry(created.rows[0] as Record<string, unknown>) });
});

// GET /api/v1/coffees/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const result = await db.execute({ sql: 'SELECT * FROM coffee_entries WHERE id = ?', args: [id] });
  if (!result.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  res.json({ data: rowToEntry(result.rows[0] as Record<string, unknown>) });
});

// PUT /api/v1/coffees/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT id FROM coffee_entries WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE coffee_entries SET
      name = ?, origin = ?, grind_level = ?, dose_grams = ?, brew_time_seconds = ?,
      notes = ?, rating = ?, roast_level = ?, coffee_type = ?, blend_components = ?,
      flavor_notes = ?, roasted_at = ?, updated_at = ?
      WHERE id = ?`,
    args: [
      body['name'] as string,
      (body['origin'] as string | null) ?? null,
      body['grindLevel'] as number,
      body['doseGrams'] as number,
      body['brewTimeSeconds'] as number,
      (body['notes'] as string | null) ?? null,
      (body['rating'] as number | null) ?? null,
      (body['roastLevel'] as string | null) ?? null,
      (body['coffeeType'] as string | null) ?? null,
      body['blendComponents'] ? JSON.stringify(body['blendComponents']) : '[]',
      body['flavorNotes'] ? JSON.stringify(body['flavorNotes']) : '[]',
      (body['roastedAt'] as string | null) ?? null,
      now,
      id,
    ],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM coffee_entries WHERE id = ?', args: [id] });
  res.json({ data: rowToEntry(updated.rows[0] as Record<string, unknown>) });
});

// DELETE /api/v1/coffees/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT id FROM coffee_entries WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  await db.execute({ sql: 'DELETE FROM coffee_entries WHERE id = ?', args: [id] });
  res.status(204).send();
});

export default router;
