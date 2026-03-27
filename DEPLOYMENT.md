# CoffeeCup — Deployment Guide

## Prerequisites

- Node.js 20 LTS
- Vercel account: https://vercel.com
- Turso database: https://turso.tech (free tier available)
- Vercel CLI: `npm install -g vercel`

## Setting Up Turso

1. Install the Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
2. Login: `turso auth login`
3. Create a database: `turso db create coffeecup`
4. Get the URL: `turso db show coffeecup --url`
5. Get an auth token: `turso db tokens create coffeecup`

## Local Development

```bash
# 1. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env and fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
# (or leave blank to use a local SQLite file at backend/local.db)

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Build the backend
cd backend && npm run build

# 4. Start the backend (port 3000)
cd backend && npm run dev

# 5. Start the frontend dev server (port 4200) — proxy forwards /api/* to :3000
cd frontend && npx ng serve
```

## Deploying to Vercel

### First-time setup

```bash
# From the project root
vercel

# Follow the prompts:
# - Link to your Vercel account
# - Set project name: coffeecup
# - Framework: Other
# - Build command: (leave blank — vercel.json handles it)
# - Output directory: (leave blank — vercel.json handles it)
```

### Set environment variables

In the Vercel dashboard (Settings > Environment Variables), add:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |

Or via CLI:
```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
```

### Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## How It Works

The `vercel.json` at the project root configures two things:

1. **Angular SPA** -- the frontend build output (`frontend/dist/coffeecup/browser`) is served as static files. All routes not matching `/api/*` or `/health` fall through to `index.html` for Angular's client-side router.

2. **Express API** -- `api/index.ts` re-exports the Express `app` as a Vercel serverless function. Requests to `/api/*` and `/health` are routed to this function, which connects to Turso on each invocation.

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes (production) | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Yes (production) | Token from `turso db tokens create` |
| `PORT` | No | Server port (default: 3000, ignored on Vercel) |
| `NODE_ENV` | No | Set to `production` on Vercel automatically |
