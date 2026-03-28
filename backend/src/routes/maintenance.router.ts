import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function rowToTask(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    name: row['name'],
    icon: row['icon'],
    intervalType: row['interval_type'],
    intervalValue: row['interval_value'],
    lastCompletedAt: row['last_completed_at'] ?? null,
    lastCompletedShots: row['last_completed_shots'] ?? null,
    isPreset: row['is_preset'] === 1 || row['is_preset'] === true,
    sortOrder: row['sort_order'],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  };
}

async function getTotalShots(): Promise<number> {
  const result = await db.execute({
    sql: `SELECT value FROM user_settings WHERE key = 'total_shots'`,
    args: [],
  });
  if (!result.rows.length) return 0;
  return parseInt((result.rows[0] as Record<string, unknown>)['value'] as string, 10) || 0;
}

// GET /tasks
router.get('/tasks', async (_req: Request, res: Response) => {
  const result = await db.execute('SELECT * FROM maintenance_tasks ORDER BY sort_order ASC');
  res.json({ data: result.rows.map(row => rowToTask(row as Record<string, unknown>)) });
});

// POST /tasks
router.post('/tasks', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (!body['name'] || !body['icon'] || !body['intervalType'] || body['intervalValue'] == null) {
    res.status(400).json({ error: 'Missing required fields: name, icon, intervalType, intervalValue' });
    return;
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const maxOrderResult = await db.execute('SELECT MAX(sort_order) as max_order FROM maintenance_tasks');
  const maxOrder = ((maxOrderResult.rows[0] as Record<string, unknown>)['max_order'] as number | null) ?? -1;
  await db.execute({
    sql: `INSERT INTO maintenance_tasks
      (id, name, icon, interval_type, interval_value, last_completed_at, last_completed_shots, is_preset, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, ?)`,
    args: [
      id,
      body['name'] as string,
      body['icon'] as string,
      body['intervalType'] as string,
      body['intervalValue'] as number,
      maxOrder + 1,
      now,
      now,
    ],
  });
  const created = await db.execute({ sql: 'SELECT * FROM maintenance_tasks WHERE id = ?', args: [id] });
  res.status(201).json({ data: rowToTask(created.rows[0] as Record<string, unknown>) });
});

// PUT /tasks/:id
router.put('/tasks/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT * FROM maintenance_tasks WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Maintenance task not found' });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  const row = existing.rows[0] as Record<string, unknown>;
  await db.execute({
    sql: `UPDATE maintenance_tasks SET
      name = ?, icon = ?, interval_type = ?, interval_value = ?, updated_at = ?
      WHERE id = ?`,
    args: [
      (body['name'] as string) ?? row['name'],
      (body['icon'] as string) ?? row['icon'],
      (body['intervalType'] as string) ?? row['interval_type'],
      (body['intervalValue'] as number) ?? row['interval_value'],
      now,
      id,
    ],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM maintenance_tasks WHERE id = ?', args: [id] });
  res.json({ data: rowToTask(updated.rows[0] as Record<string, unknown>) });
});

// DELETE /tasks/:id
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT * FROM maintenance_tasks WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Maintenance task not found' });
    return;
  }
  const row = existing.rows[0] as Record<string, unknown>;
  if (row['is_preset'] === 1 || row['is_preset'] === true) {
    res.status(403).json({ error: 'Preset tasks cannot be deleted' });
    return;
  }
  await db.execute({ sql: 'DELETE FROM maintenance_tasks WHERE id = ?', args: [id] });
  res.status(204).send();
});

// POST /tasks/:id/complete
router.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const existing = await db.execute({ sql: 'SELECT id FROM maintenance_tasks WHERE id = ?', args: [id] });
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Maintenance task not found' });
    return;
  }
  const totalShots = await getTotalShots();
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE maintenance_tasks SET last_completed_at = ?, last_completed_shots = ?, updated_at = ? WHERE id = ?`,
    args: [now, totalShots, now, id],
  });
  const updated = await db.execute({ sql: 'SELECT * FROM maintenance_tasks WHERE id = ?', args: [id] });
  res.json({ data: rowToTask(updated.rows[0] as Record<string, unknown>) });
});

// GET /settings
router.get('/settings', async (_req: Request, res: Response) => {
  const totalShots = await getTotalShots();
  res.json({ data: { totalShots } });
});

// PUT /settings
router.put('/settings', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  if (body['totalShots'] == null || typeof body['totalShots'] !== 'number') {
    res.status(400).json({ error: 'Missing required field: totalShots (number)' });
    return;
  }
  const value = Math.max(0, Math.floor(body['totalShots'] as number));
  await db.execute({
    sql: `INSERT INTO user_settings (key, value) VALUES ('total_shots', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [String(value)],
  });
  res.json({ data: { totalShots: value } });
});

export default router;
