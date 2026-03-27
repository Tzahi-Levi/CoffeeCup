import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import coffeesRouter from './routes/coffees.router';

const app = express();
const PORT = process.env['PORT'] ? Number(process.env['PORT']) : 3000;
const DIST_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist', 'coffeecup', 'browser');

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// JSON body parser
app.use(express.json());

// CORS — allow Angular dev server in development
app.use(cors({
  origin: process.env['NODE_ENV'] === 'production' ? false : 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/coffees', coffeesRouter);

// Serve Angular build output
app.use(express.static(DIST_DIR));

// SPA fallback — all non-matched routes return index.html
// app.use() is used instead of app.get('*') because Express 5 requires named wildcards
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log with request context so 500s are traceable in production
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unhandled server error',
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  }));
  res.status(500).json({ error: 'Internal Server Error' });
});

if (!process.env['VERCEL']) {
  (async () => {
    await initDb();
    app.listen(PORT, () => {
      console.log(JSON.stringify({
        level: 'info',
        message: 'CoffeeCup server started',
        port: PORT,
        env: process.env['NODE_ENV'] ?? 'development',
        staticDir: DIST_DIR,
        timestamp: new Date().toISOString(),
      }));
    });
  })();
}

export default app;
