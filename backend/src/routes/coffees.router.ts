import { Router, Request, Response } from 'express';
import { db, adjustTotalShots } from '../db';

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
    rating: row['avg_rating'] != null ? Number(row['avg_rating']) : null,
    roastLevel: row['roast_level'] ?? null,
    coffeeType: row['coffee_type'] ?? null,
    blendComponents: row['blend_components']
      ? JSON.parse(row['blend_components'] as string)
      : [],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

// GET /api/v1/coffees
router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
const result = await db.execute({
    sql: `SELECT c.*, ROUND(AVG(l.rating), 1) AS avg_rating
          FROM coffee_entries c
          LEFT JOIN brew_logs l ON l.coffee_id = c.id
          WHERE c.user_id = ?
          GROUP BY c.id
          ORDER BY c.created_at DESC`,
    args: [userId],
  });
  res.json({ data: result.rows.map(rowToEntry) });
});

// POST /api/v1/coffees
router.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const body = req.body as Record<string, unknown>;
  if (!body['name'] || body['grindLevel'] == null || body['doseGrams'] == null || body['brewTimeSeconds'] == null) {
    res.status(400).json({ error: 'Missing required fields: name, grindLevel, doseGrams, brewTimeSeconds' });
    return;
  }
  const now = new Date().toISOString();
  const id = (body['id'] as string) ?? crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO coffee_entries
      (id, name, origin, grind_level, dose_grams, brew_time_seconds, notes, roast_level, coffee_type, blend_components, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      body['name'] as string,
      (body['origin'] as string | null) ?? null,
      body['grindLevel'] as number,
      body['doseGrams'] as number,
      body['brewTimeSeconds'] as number,
      (body['notes'] as string | null) ?? null,
      (body['roastLevel'] as string | null) ?? null,
      (body['coffeeType'] as string | null) ?? null,
      body['blendComponents'] ? JSON.stringify(body['blendComponents']) : '[]',
      userId,
      now,
      now,
    ],
  });
  const created = await db.execute({
    sql: `SELECT c.*, ROUND(AVG(l.rating), 1) AS avg_rating
          FROM coffee_entries c
          LEFT JOIN brew_logs l ON l.coffee_id = c.id
          WHERE c.id = ? AND c.user_id = ?
          GROUP BY c.id`,
    args: [id, userId],
  });
  res.status(201).json({ data: rowToEntry(created.rows[0] as Record<string, unknown>) });
});

// GET /api/v1/coffees/:id
router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const id = req.params['id'] as string;
  const result = await db.execute({
    sql: `SELECT c.*, ROUND(AVG(l.rating), 1) AS avg_rating
          FROM coffee_entries c
          LEFT JOIN brew_logs l ON l.coffee_id = c.id
          WHERE c.id = ? AND c.user_id = ?
          GROUP BY c.id`,
    args: [id, userId],
  });
  if (!result.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  res.json({ data: rowToEntry(result.rows[0] as Record<string, unknown>) });
});

// PUT /api/v1/coffees/:id
router.put('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const id = req.params['id'] as string;
  const existing = await db.execute({
    sql: 'SELECT id FROM coffee_entries WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE coffee_entries SET
      name = ?, origin = ?, grind_level = ?, dose_grams = ?, brew_time_seconds = ?,
      notes = ?, roast_level = ?, coffee_type = ?, blend_components = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
    args: [
      body['name'] as string,
      (body['origin'] as string | null) ?? null,
      body['grindLevel'] as number,
      body['doseGrams'] as number,
      body['brewTimeSeconds'] as number,
      (body['notes'] as string | null) ?? null,
      (body['roastLevel'] as string | null) ?? null,
      (body['coffeeType'] as string | null) ?? null,
      body['blendComponents'] ? JSON.stringify(body['blendComponents']) : '[]',
      now,
      id,
      userId,
    ],
  });
  const updated = await db.execute({
    sql: `SELECT c.*, ROUND(AVG(l.rating), 1) AS avg_rating
          FROM coffee_entries c
          LEFT JOIN brew_logs l ON l.coffee_id = c.id
          WHERE c.id = ? AND c.user_id = ?
          GROUP BY c.id`,
    args: [id, userId],
  });
  res.json({ data: rowToEntry(updated.rows[0] as Record<string, unknown>) });
});

// DELETE /api/v1/coffees/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const id = req.params['id'] as string;
  const existing = await db.execute({
    sql: 'SELECT id FROM coffee_entries WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  await db.execute({ sql: 'DELETE FROM coffee_entries WHERE id = ? AND user_id = ?', args: [id, userId] });
  res.status(204).send();
});

// ── Brew Logs ──────────────────────────────────────────────────────────────

function rowToLog(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    coffeeId: row['coffee_id'],
    rating: row['rating'],
    doseGrams: row['dose_grams'],
    grindLevel: row['grind_level'],
    brewTimeSeconds: row['brew_time_seconds'],
    yieldGrams: row['yield_grams'] ?? null,
    notes: row['notes'] ?? null,
    createdAt: row['created_at'],
  };
}

// GET /api/v1/coffees/:coffeeId/logs
router.get('/:coffeeId/logs', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const coffeeId = req.params['coffeeId'] as string;
  // Verify coffee ownership
  const coffee = await db.execute({
    sql: 'SELECT id FROM coffee_entries WHERE id = ? AND user_id = ?',
    args: [coffeeId, userId],
  });
  if (!coffee.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  const result = await db.execute({
    sql: 'SELECT * FROM brew_logs WHERE coffee_id = ? ORDER BY created_at DESC',
    args: [coffeeId],
  });
  res.json({ data: result.rows.map(r => rowToLog(r as Record<string, unknown>)) });
});

// POST /api/v1/coffees/:coffeeId/logs
router.post('/:coffeeId/logs', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const coffeeId = req.params['coffeeId'] as string;
  const coffee = await db.execute({
    sql: 'SELECT id FROM coffee_entries WHERE id = ? AND user_id = ?',
    args: [coffeeId, userId],
  });
  if (!coffee.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (body['rating'] == null || body['doseGrams'] == null || body['grindLevel'] == null || body['brewTimeSeconds'] == null) {
    res.status(400).json({ error: 'Missing required fields: rating, doseGrams, grindLevel, brewTimeSeconds' });
    return;
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO brew_logs (id, coffee_id, rating, dose_grams, grind_level, brew_time_seconds, yield_grams, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, coffeeId,
      body['rating'] as number,
      body['doseGrams'] as number,
      body['grindLevel'] as number,
      body['brewTimeSeconds'] as number,
      (body['yieldGrams'] as number | null) ?? null,
      (body['notes'] as string | null) ?? null,
      now,
    ],
  });
  const created = await db.execute({ sql: 'SELECT * FROM brew_logs WHERE id = ?', args: [id] });
  await adjustTotalShots(userId, 1);
  res.status(201).json({ data: rowToLog(created.rows[0] as Record<string, unknown>) });
});

// PUT /api/v1/coffees/:coffeeId/logs/:logId
router.put('/:coffeeId/logs/:logId', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const coffeeId = req.params['coffeeId'] as string;
  const logId = req.params['logId'] as string;
  const coffee = await db.execute({
    sql: 'SELECT id FROM coffee_entries WHERE id = ? AND user_id = ?',
    args: [coffeeId, userId],
  });
  if (!coffee.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  const existing = await db.execute({ sql: 'SELECT id FROM brew_logs WHERE id = ? AND coffee_id = ?', args: [logId, coffeeId] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Brew log not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (body['rating'] == null || body['doseGrams'] == null || body['grindLevel'] == null || body['brewTimeSeconds'] == null) {
    res.status(400).json({ error: 'Missing required fields: rating, doseGrams, grindLevel, brewTimeSeconds' });
    return;
  }
  await db.execute({
    sql: `UPDATE brew_logs SET rating = ?, dose_grams = ?, grind_level = ?, brew_time_seconds = ?, yield_grams = ?, notes = ?
          WHERE id = ? AND coffee_id = ?`,
    args: [
      body['rating'] as number,
      body['doseGrams'] as number,
      body['grindLevel'] as number,
      body['brewTimeSeconds'] as number,
      (body['yieldGrams'] as number | null) ?? null,
      (body['notes'] as string | null) ?? null,
      logId,
      coffeeId,
    ],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM brew_logs WHERE id = ?', args: [logId] });
  res.json({ data: rowToLog(updated.rows[0] as Record<string, unknown>) });
});

// DELETE /api/v1/coffees/:coffeeId/logs/:logId
router.delete('/:coffeeId/logs/:logId', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const coffeeId = req.params['coffeeId'] as string;
  const logId = req.params['logId'] as string;
  // Verify coffee ownership before deleting log
  const coffee = await db.execute({
    sql: 'SELECT id FROM coffee_entries WHERE id = ? AND user_id = ?',
    args: [coffeeId, userId],
  });
  if (!coffee.rows.length) {
    res.status(404).json({ error: 'Coffee entry not found' });
    return;
  }
  const existing = await db.execute({ sql: 'SELECT id FROM brew_logs WHERE id = ?', args: [logId] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Brew log not found' });
    return;
  }
  await db.execute({ sql: 'DELETE FROM brew_logs WHERE id = ?', args: [logId] });
  await adjustTotalShots(userId, -1);
  res.status(204).send();
});

export default router;
