# Publish Deployer — Agent Memory

## CoffeeCup Project Patterns

### Angular 17 Build Output
- `npm run build` produces output at `frontend/dist/coffeecup/browser/` (includes `browser/` subdirectory).
- The top-level `ls` of `dist/coffeecup/` may not show `browser/` as a file — always use `find -type d` to confirm the full tree.

### Backend Static File Path
- `backend/src/server.ts` serves static files from:
  `path.join(__dirname, '..', '..', 'frontend', 'dist', 'coffeecup', 'browser')`
- At runtime (`backend/dist/server.js`), `__dirname` resolves to `backend/dist/`, so the resolved path is `frontend/dist/coffeecup/browser/` relative to project root.
- The Dockerfile copies the frontend dist into `./frontend/dist` inside the container, which satisfies this path correctly.

### Dockerfile (multi-stage, 3 stages)
- Stage 1: `node:20-alpine` — builds Angular frontend
- Stage 2: `node:20-alpine` — builds Express TypeScript backend
- Stage 3: `node:20-alpine` — production runtime, copies both build outputs, runs as default node user
- HEALTHCHECK uses `wget -qO- http://localhost:3000/health`

### Environment Variables
- `PORT` (default 3000) and `NODE_ENV` are the only two variables; no database or external services required.
- All app data lives in browser `localStorage` — zero server-side state.

### CI/CD (.github/workflows/ci.yml)
- Triggers: push to `main`/`develop`, PRs to `main`
- Jobs: `frontend-test` → `backend-build` → `docker-build` (gated)
- Node version: 20, uses `actions/cache` via `actions/setup-node` cache param
- Docker build uses `docker/build-push-action@v5` with GHA layer cache; `push: false` (build-only, no registry push)

### Platform
- No cloud platform configured yet — deployment is local/Docker only.
- For cloud hosting, Render (Docker) is the recommended next step for this stack.
