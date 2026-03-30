import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// In-memory cache for RS256 public keys (keyed by kid or 'default')
const keyCache = new Map<string, string>();

async function fetchPublicKey(kid?: string): Promise<string> {
  const supabaseUrl = process.env['SUPABASE_URL'];
  if (!supabaseUrl) throw new Error('SUPABASE_URL env var is not set');

  const cacheKey = kid ?? 'default';
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);

  const { keys } = await res.json() as { keys: any[] };
  const jwk = kid ? keys.find(k => k['kid'] === kid) : keys[0];
  if (!jwk) throw new Error(`No matching key in JWKS${kid ? ` (kid=${kid})` : ''}`);

  const pem = createPublicKey({ key: jwk, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' }) as string;

  keyCache.set(cacheKey, pem);
  return pem;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['authorization']?.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const decoded = jwt.decode(token, { complete: true });
  const alg = (decoded?.header?.alg ?? 'HS256') as jwt.Algorithm;
  const kid = decoded?.header?.kid as string | undefined;

  try {
    let secret: string;

    if (alg === 'HS256') {
      const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
      if (!jwtSecret) {
        console.error('[auth] SUPABASE_JWT_SECRET is not set');
        res.status(500).json({ error: 'Server misconfiguration' });
        return;
      }
      secret = jwtSecret;
    } else {
      // RS256 or other asymmetric algorithm — fetch public key from JWKS
      secret = await fetchPublicKey(kid);
    }

    const payload = jwt.verify(token, secret, { algorithms: [alg] }) as Record<string, unknown>;

    if (payload['role'] !== 'authenticated') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.locals['userId'] = payload['sub'];
    next();
  } catch (e) {
    console.error('[auth] JWT verification failed:', (e as Error).message);
    res.status(401).json({
      error: e instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token',
    });
  }
}
