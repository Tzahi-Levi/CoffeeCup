import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['authorization']?.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env['SUPABASE_JWT_SECRET']!, { algorithms: ['HS256'] }) as Record<string, unknown>;
    if (payload['role'] !== 'authenticated') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.locals['userId'] = payload['sub'];
    next();
  } catch (e) {
    res.status(401).json({
      error: e instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token',
    });
  }
}
