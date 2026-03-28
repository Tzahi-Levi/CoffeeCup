import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function rowToEntry(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    name: row['name'],
    origin: row['origin'] ?? null,
    roastLevel: row['roast_level'] ?? null,
    roastedAt: row['roasted_at'] ?? null,
    flavorNotes: row['flavor_notes']
      ? JSON.parse(row['flavor_notes'] as string)
      : [],
    bagWeightGrams: row['bag_weight_grams'] ?? null,
    notes: row['notes'] ?? null,
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

// GET /api/v1/beans
router.get('/', async (_req: Request, res: Response) => {
  const result = await db.execute('SELECT * FROM bean_entries ORDER BY created_at DESC');
  res.json({ data: result.rows.map(rowToEntry) });
});

// POST /api/v1/beans
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (!body['name']) {
    res.status(400).json({ error: 'Missing required field: name' });
    return;
  }
  const now = new Date().toISOString();
  const id = (body['id'] as string) ?? crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO bean_entries
      (id, name, origin, roast_level, roasted_at, flavor_notes, bag_weight_grams, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      body['name'] as string,
      (body['origin'] as string | null) ?? null,
      (body['roastLevel'] as string | null) ?? null,
      (body['roastedAt'] as string | null) ?? null,
      body['flavorNotes'] ? JSON.stringify(body['flavorNotes']) : '[]',
      (body['bagWeightGrams'] as number | null) ?? null,
      (body['notes'] as string | null) ?? null,
      now,
      now,
    ],
  });
  const created = await db.execute({ sql: 'SELECT * FROM bean_entries WHERE id = ?', args: [id] });
  res.status(201).json({ data: rowToEntry(created.rows[0] as Record<string, unknown>) });
});

// GET /api/v1/beans/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const result = await db.execute({ sql: 'SELECT * FROM bean_entries WHERE id = ?', args: [id] });
  if (!result.rows.length) {
    res.status(404).json({ error: 'Bean entry not found' });
    return;
  }
  res.json({ data: rowToEntry(result.rows[0] as Record<string, unknown>) });
});

// PUT /api/v1/beans/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT id FROM bean_entries WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Bean entry not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE bean_entries SET
      name = ?, origin = ?, roast_level = ?, roasted_at = ?,
      flavor_notes = ?, bag_weight_grams = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
    args: [
      body['name'] as string,
      (body['origin'] as string | null) ?? null,
      (body['roastLevel'] as string | null) ?? null,
      (body['roastedAt'] as string | null) ?? null,
      body['flavorNotes'] ? JSON.stringify(body['flavorNotes']) : '[]',
      (body['bagWeightGrams'] as number | null) ?? null,
      (body['notes'] as string | null) ?? null,
      now,
      id,
    ],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM bean_entries WHERE id = ?', args: [id] });
  res.json({ data: rowToEntry(updated.rows[0] as Record<string, unknown>) });
});

// DELETE /api/v1/beans/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT id FROM bean_entries WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Bean entry not found' });
    return;
  }
  await db.execute({ sql: 'DELETE FROM bean_entries WHERE id = ?', args: [id] });
  res.status(204).send();
});

export default router;
