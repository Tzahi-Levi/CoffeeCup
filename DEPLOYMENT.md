# CoffeeCup — Deployment Guide

## Quick Start (Local Development)

### Frontend dev server
```
cd frontend
npm install
npx ng serve
# → http://localhost:4200
```

### Backend dev server
```
cd backend
npm install
npm run dev
# → http://localhost:3000
```

## Production Build

### 1. Build the Angular frontend
```
cd frontend
npm install
npm run build
# Output: frontend/dist/coffeecup/browser/
```

### 2. Build the Express backend
```
cd backend
npm install
npm run build
# Output: backend/dist/server.js
```

### 3. Serve (backend serves the Angular build as static files)
```
cd backend
npm start
# → http://localhost:3000
```

## Docker Deployment

### Build and run with Docker
```
# From project root
docker build -t coffeecup:latest .
docker run -p 3000:3000 coffeecup:latest
# → http://localhost:3000
```

### Docker Compose
```
docker-compose up --build
# → http://localhost:3000
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server listen port |
| `NODE_ENV` | `development` | Runtime environment |

## Health Check

`GET /health` returns:
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

## CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` pipeline runs on every push to `main`/`develop` and on PRs to `main`:

1. **frontend-test** — `npm ci && npm run build`
2. **backend-build** — `npm ci && npm run build`
3. **docker-build** — builds Docker image (gated on 1+2 passing)

## Data Persistence

CoffeeCup uses browser `localStorage` for all data under the key `coffeecup_v1`. No database or server-side state is required. Data persists across page refreshes within the same browser profile.

## File Structure After Build

```
CoffeeCup/
├── frontend/dist/coffeecup/browser/  # Angular build output
│   ├── index.html
│   ├── main-*.js
│   └── ...
├── backend/dist/
│   └── server.js                     # Compiled Express server
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```
