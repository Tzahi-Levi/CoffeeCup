import express from 'express';
import request from 'supertest';
import coffeesRouter from './coffees.router';

// ---------------------------------------------------------------------------
// Mock the db module to avoid needing a real Turso / libsql connection.
// Every test configures db.execute to return the rows it needs.
// ---------------------------------------------------------------------------
jest.mock('../db', () => ({
  db: {
    execute: jest.fn(),
  },
}));

import { db } from '../db';

const mockedExecute = db.execute as jest.Mock;

// ---------------------------------------------------------------------------
// Build a minimal Express app that mirrors the real server's middleware
// relevant to these routes (JSON body parsing + the router mount point).
// This avoids importing server.ts which triggers initDb() side effects.
// ---------------------------------------------------------------------------
function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/coffees', coffeesRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_DB_ROW = {
  id: 'test-uuid-1',
  name: 'Ethiopian Yirgacheffe',
  origin: 'Ethiopia',
  grind_level: 8,
  dose_grams: 18.5,
  brew_time_seconds: 30,
  notes: 'Bright and fruity',
  rating: 5,
  roast_level: 'light',
  coffee_type: 'single-origin',
  blend_components: '[]',
  created_at: '2026-03-27T10:00:00.000Z',
  updated_at: '2026-03-27T10:00:00.000Z',
};

const MOCK_CAMEL_ENTRY = {
  id: 'test-uuid-1',
  name: 'Ethiopian Yirgacheffe',
  origin: 'Ethiopia',
  grindLevel: 8,
  doseGrams: 18.5,
  brewTimeSeconds: 30,
  notes: 'Bright and fruity',
  rating: 5,
  roastLevel: 'light',
  coffeeType: 'single-origin',
  blendComponents: [],
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
};

const VALID_CREATE_BODY = {
  name: 'Colombian Supremo',
  origin: 'Colombia',
  grindLevel: 5,
  doseGrams: 20,
  brewTimeSeconds: 45,
  notes: 'Smooth and nutty',
  rating: 4,
  roastLevel: 'medium',
  coffeeType: 'single-origin',
  blendComponents: [],
};

const MOCK_BLEND_ROW = {
  ...MOCK_DB_ROW,
  id: 'test-uuid-blend',
  name: 'House Blend',
  coffee_type: 'blend',
  blend_components: JSON.stringify([
    { name: 'Brazilian Santos', percentage: 60 },
    { name: 'Ethiopian Sidamo', percentage: 40 },
  ]),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Coffees Router — /api/v1/coffees', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/coffees
  // -------------------------------------------------------------------------
  describe('GET /api/v1/coffees', () => {
    it('returns 200 with { data: [] } when no entries exist', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/v1/coffees');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [] });
      expect(mockedExecute).toHaveBeenCalledTimes(1);
      expect(mockedExecute).toHaveBeenCalledWith(
        'SELECT * FROM coffee_entries ORDER BY created_at DESC'
      );
    });

    it('returns 200 with { data: [entry] } when entries exist', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [MOCK_DB_ROW] });

      const res = await request(app).get('/api/v1/coffees');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toEqual(MOCK_CAMEL_ENTRY);
    });

    it('maps snake_case DB columns to camelCase JSON', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [MOCK_DB_ROW] });

      const res = await request(app).get('/api/v1/coffees');
      const entry = res.body.data[0];

      // Verify camelCase keys are present
      expect(entry).toHaveProperty('grindLevel');
      expect(entry).toHaveProperty('doseGrams');
      expect(entry).toHaveProperty('brewTimeSeconds');
      expect(entry).toHaveProperty('roastLevel');
      expect(entry).toHaveProperty('coffeeType');
      expect(entry).toHaveProperty('blendComponents');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('updatedAt');

      // Verify snake_case keys are NOT present
      expect(entry).not.toHaveProperty('grind_level');
      expect(entry).not.toHaveProperty('dose_grams');
      expect(entry).not.toHaveProperty('brew_time_seconds');
      expect(entry).not.toHaveProperty('roast_level');
      expect(entry).not.toHaveProperty('coffee_type');
      expect(entry).not.toHaveProperty('blend_components');
      expect(entry).not.toHaveProperty('created_at');
      expect(entry).not.toHaveProperty('updated_at');
    });

    it('returns multiple entries in correct order', async () => {
      const row2 = { ...MOCK_DB_ROW, id: 'test-uuid-2', name: 'Brazilian Santos' };
      mockedExecute.mockResolvedValueOnce({ rows: [MOCK_DB_ROW, row2] });

      const res = await request(app).get('/api/v1/coffees');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].id).toBe('test-uuid-1');
      expect(res.body.data[1].id).toBe('test-uuid-2');
    });

    it('defaults null for optional fields that are undefined in DB row', async () => {
      const sparseRow = {
        id: 'test-uuid-sparse',
        name: 'Minimal Entry',
        grind_level: 3,
        dose_grams: 15,
        brew_time_seconds: 25,
        created_at: '2026-03-27T10:00:00.000Z',
        updated_at: '2026-03-27T10:00:00.000Z',
        // origin, notes, rating, roast_level, coffee_type, blend_components are all undefined
      };
      mockedExecute.mockResolvedValueOnce({ rows: [sparseRow] });

      const res = await request(app).get('/api/v1/coffees');
      const entry = res.body.data[0];

      expect(entry.origin).toBeNull();
      expect(entry.notes).toBeNull();
      expect(entry.rating).toBeNull();
      expect(entry.roastLevel).toBeNull();
      expect(entry.coffeeType).toBeNull();
      expect(entry.blendComponents).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/coffees
  // -------------------------------------------------------------------------
  describe('POST /api/v1/coffees', () => {
    it('returns 201 with created entry when body is valid', async () => {
      const createdRow = {
        ...MOCK_DB_ROW,
        id: 'generated-uuid',
        name: 'Colombian Supremo',
        origin: 'Colombia',
        grind_level: 5,
        dose_grams: 20,
        brew_time_seconds: 45,
        notes: 'Smooth and nutty',
        rating: 4,
        roast_level: 'medium',
        coffee_type: 'single-origin',
        blend_components: '[]',
      };

      // First call: INSERT, second call: SELECT to return created entry
      mockedExecute
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [createdRow] }); // SELECT

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(VALID_CREATE_BODY);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Colombian Supremo');
      expect(res.body.data.grindLevel).toBe(5);
      expect(res.body.data.doseGrams).toBe(20);
      expect(mockedExecute).toHaveBeenCalledTimes(2);
    });

    it('returns 400 when name is missing', async () => {
      const body = { ...VALID_CREATE_BODY };
      delete (body as Record<string, unknown>)['name'];

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
      expect(mockedExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when grindLevel is missing', async () => {
      const body = { ...VALID_CREATE_BODY };
      delete (body as Record<string, unknown>)['grindLevel'];

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
      expect(mockedExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when doseGrams is missing', async () => {
      const body = { ...VALID_CREATE_BODY };
      delete (body as Record<string, unknown>)['doseGrams'];

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
      expect(mockedExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when brewTimeSeconds is missing', async () => {
      const body = { ...VALID_CREATE_BODY };
      delete (body as Record<string, unknown>)['brewTimeSeconds'];

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
      expect(mockedExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when body is completely empty', async () => {
      const res = await request(app)
        .post('/api/v1/coffees')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('parses blendComponents as array in response', async () => {
      const bodyWithBlend = {
        ...VALID_CREATE_BODY,
        coffeeType: 'blend',
        blendComponents: [
          { name: 'Brazilian Santos', percentage: 60 },
          { name: 'Ethiopian Sidamo', percentage: 40 },
        ],
      };

      mockedExecute
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [MOCK_BLEND_ROW] }); // SELECT

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(bodyWithBlend);

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.data.blendComponents)).toBe(true);
      expect(res.body.data.blendComponents).toHaveLength(2);
      expect(res.body.data.blendComponents[0]).toEqual({
        name: 'Brazilian Santos',
        percentage: 60,
      });
    });

    it('uses provided id when present in body', async () => {
      const bodyWithId = { ...VALID_CREATE_BODY, id: 'custom-id-123' };
      const createdRow = {
        ...MOCK_DB_ROW,
        id: 'custom-id-123',
        name: 'Colombian Supremo',
      };

      mockedExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdRow] });

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(bodyWithId);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('custom-id-123');

      // Verify the INSERT was called with the custom id
      const insertCall = mockedExecute.mock.calls[0][0];
      expect(insertCall.args[0]).toBe('custom-id-123');
    });

    it('stores blendComponents as JSON string in the INSERT args', async () => {
      const components = [{ name: 'Bean A', percentage: 100 }];
      const bodyWithBlend = { ...VALID_CREATE_BODY, blendComponents: components };

      mockedExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            ...MOCK_DB_ROW,
            blend_components: JSON.stringify(components),
          }],
        });

      await request(app)
        .post('/api/v1/coffees')
        .send(bodyWithBlend);

      const insertCall = mockedExecute.mock.calls[0][0];
      // blend_components is the 11th arg (index 10)
      expect(insertCall.args[10]).toBe(JSON.stringify(components));
    });

    it('defaults blendComponents to empty JSON array when not provided', async () => {
      const bodyNoBlend = { ...VALID_CREATE_BODY };
      delete (bodyNoBlend as Record<string, unknown>)['blendComponents'];

      mockedExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [MOCK_DB_ROW] });

      await request(app)
        .post('/api/v1/coffees')
        .send(bodyNoBlend);

      const insertCall = mockedExecute.mock.calls[0][0];
      expect(insertCall.args[10]).toBe('[]');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/coffees/:id
  // -------------------------------------------------------------------------
  describe('GET /api/v1/coffees/:id', () => {
    it('returns 200 with entry when found', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [MOCK_DB_ROW] });

      const res = await request(app).get('/api/v1/coffees/test-uuid-1');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(MOCK_CAMEL_ENTRY);
      expect(mockedExecute).toHaveBeenCalledWith({
        sql: 'SELECT * FROM coffee_entries WHERE id = ?',
        args: ['test-uuid-1'],
      });
    });

    it('returns 404 when not found', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/v1/coffees/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Coffee entry not found');
    });

    it('passes the route parameter as the query argument', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [] });

      await request(app).get('/api/v1/coffees/abc-123-def');

      expect(mockedExecute).toHaveBeenCalledWith({
        sql: 'SELECT * FROM coffee_entries WHERE id = ?',
        args: ['abc-123-def'],
      });
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/v1/coffees/:id
  // -------------------------------------------------------------------------
  describe('PUT /api/v1/coffees/:id', () => {
    it('returns 200 with updated entry', async () => {
      const updatedRow = {
        ...MOCK_DB_ROW,
        name: 'Updated Ethiopian',
        grind_level: 6,
        updated_at: '2026-03-27T12:00:00.000Z',
      };

      mockedExecute
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1' }] }) // existence check
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [updatedRow] }); // SELECT after update

      const res = await request(app)
        .put('/api/v1/coffees/test-uuid-1')
        .send({
          name: 'Updated Ethiopian',
          origin: 'Ethiopia',
          grindLevel: 6,
          doseGrams: 18.5,
          brewTimeSeconds: 30,
          notes: 'Bright and fruity',
          rating: 5,
          roastLevel: 'light',
          coffeeType: 'single-origin',
          blendComponents: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Ethiopian');
      expect(res.body.data.grindLevel).toBe(6);
      expect(mockedExecute).toHaveBeenCalledTimes(3);
    });

    it('returns 404 when not found', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [] }); // existence check fails

      const res = await request(app)
        .put('/api/v1/coffees/nonexistent-id')
        .send(VALID_CREATE_BODY);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Coffee entry not found');
      // Should only call execute once (the existence check)
      expect(mockedExecute).toHaveBeenCalledTimes(1);
    });

    it('checks existence before performing the update', async () => {
      mockedExecute
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [MOCK_DB_ROW] });

      await request(app)
        .put('/api/v1/coffees/test-uuid-1')
        .send(VALID_CREATE_BODY);

      // First call should be the existence check
      expect(mockedExecute.mock.calls[0][0]).toEqual({
        sql: 'SELECT id FROM coffee_entries WHERE id = ?',
        args: ['test-uuid-1'],
      });
    });

    it('serializes blendComponents to JSON for the UPDATE query', async () => {
      const components = [{ name: 'Bean X', percentage: 100 }];
      mockedExecute
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            ...MOCK_DB_ROW,
            blend_components: JSON.stringify(components),
          }],
        });

      await request(app)
        .put('/api/v1/coffees/test-uuid-1')
        .send({ ...VALID_CREATE_BODY, blendComponents: components });

      // The UPDATE call is the second call (index 1)
      const updateCall = mockedExecute.mock.calls[1][0];
      // blend_components is the 10th arg (index 9)
      expect(updateCall.args[9]).toBe(JSON.stringify(components));
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/v1/coffees/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/v1/coffees/:id', () => {
    it('returns 204 when deleted', async () => {
      mockedExecute
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1' }] }) // existence check
        .mockResolvedValueOnce({ rows: [] }); // DELETE

      const res = await request(app).delete('/api/v1/coffees/test-uuid-1');

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(mockedExecute).toHaveBeenCalledTimes(2);
    });

    it('returns 404 when not found', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/v1/coffees/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Coffee entry not found');
      expect(mockedExecute).toHaveBeenCalledTimes(1);
    });

    it('executes DELETE query with the correct id', async () => {
      mockedExecute
        .mockResolvedValueOnce({ rows: [{ id: 'delete-me' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app).delete('/api/v1/coffees/delete-me');

      expect(mockedExecute.mock.calls[1][0]).toEqual({
        sql: 'DELETE FROM coffee_entries WHERE id = ?',
        args: ['delete-me'],
      });
    });

    it('checks existence before performing the delete', async () => {
      mockedExecute
        .mockResolvedValueOnce({ rows: [{ id: 'test-uuid-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app).delete('/api/v1/coffees/test-uuid-1');

      expect(mockedExecute.mock.calls[0][0]).toEqual({
        sql: 'SELECT id FROM coffee_entries WHERE id = ?',
        args: ['test-uuid-1'],
      });
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases & error handling
  // -------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('handles Content-Type application/json correctly', async () => {
      mockedExecute.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/v1/coffees')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('POST with grindLevel of 0 passes validation (== null is false for 0)', async () => {
      // grindLevel == null is the check; 0 == null is false, so 0 should be accepted
      const body = { ...VALID_CREATE_BODY, grindLevel: 0 };
      const createdRow = { ...MOCK_DB_ROW, grind_level: 0 };

      mockedExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdRow] });

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(body);

      expect(res.status).toBe(201);
    });

    it('POST with null optional fields succeeds', async () => {
      const body = {
        name: 'Bare Minimum',
        grindLevel: 3,
        doseGrams: 15,
        brewTimeSeconds: 25,
        origin: null,
        notes: null,
        rating: null,
        roastLevel: null,
        coffeeType: null,
      };
      const createdRow = {
        id: 'test-uuid-minimal',
        name: 'Bare Minimum',
        origin: null,
        grind_level: 3,
        dose_grams: 15,
        brew_time_seconds: 25,
        notes: null,
        rating: null,
        roast_level: null,
        coffee_type: null,
        blend_components: '[]',
        created_at: '2026-03-27T10:00:00.000Z',
        updated_at: '2026-03-27T10:00:00.000Z',
      };

      mockedExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdRow] });

      const res = await request(app)
        .post('/api/v1/coffees')
        .send(body);

      expect(res.status).toBe(201);
      expect(res.body.data.origin).toBeNull();
      expect(res.body.data.notes).toBeNull();
      expect(res.body.data.rating).toBeNull();
    });
  });
});
