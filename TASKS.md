# CoffeeCup v2 -- Migration Task Plan

> Single source of truth for the localStorage-to-Turso migration.
> Generated from `ARCHITECTURE.md` v2.0. This is NOT a greenfield build --
> all Angular components, SCSS, animations, and routing are already implemented.
> Only persistence, service layer, and deployment plumbing change.

---

## Status Summary

| Phase | Total | Pending | In Progress | Completed |
|-------|-------|---------|-------------|-----------|
| 1 -- Backend API          | 5  | 5 | 0 | 0 |
| 2 -- Frontend Migration   | 6  | 6 | 0 | 0 |
| 3 -- Deployment Config    | 3  | 3 | 0 | 0 |
| 4 -- Tests                | 4  | 4 | 0 | 0 |
| **Total**                 | **18** | **18** | **0** | **0** |

---

## Phase 1: Backend API (Turso + Express Routes)

**Priority:** High
**Status:** pending

All frontend migration tasks depend on the API being available.

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| M001 | Install backend dependencies | Install `@libsql/client`, `cors` as production dependencies and `@types/cors`, `dotenv` as dev dependencies in `backend/package.json`. Run `npm install` and verify `tsc` still compiles. | backend-engineer | None | Updated `backend/package.json` with new deps, clean `npm install`, `tsc` compiles | pending |
| M002 | Create Turso database client module | Create `backend/src/db.ts`. Import `createClient` from `@libsql/client`. Read `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from `process.env`. Export a singleton `db` client instance. Export an `initDb()` async function that runs `CREATE TABLE IF NOT EXISTS coffee_entries (...)` with all columns from ARCHITECTURE.md Section 8.1 (id TEXT PK, name TEXT NOT NULL, origin TEXT, grind_level INTEGER NOT NULL, dose_grams REAL NOT NULL, brew_time_seconds INTEGER NOT NULL, notes TEXT, rating INTEGER, roast_level TEXT, coffee_type TEXT, blend_components TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL). Also create the two indexes from Section 8.3 (`idx_coffee_entries_created_at` on `created_at DESC`, `idx_coffee_entries_name` on `name`). Note: `roast_level`, `coffee_type`, and `blend_components` are extra columns for fields that already exist in the frontend data model but are not in the architecture doc's schema -- `blend_components` is stored as a JSON string. | backend-engineer | M001 | `backend/src/db.ts` with `db` export and `initDb()` function | pending |
| M003 | Create coffees REST router | Create `backend/src/routes/coffees.router.ts`. Export an Express Router mounted at `/api/v1/coffees`. Implement all five handlers per ARCHITECTURE.md Section 5.3 and Section 6: (1) `GET /` -- query all rows ordered by `created_at DESC`, map snake_case columns to camelCase, parse `blend_components` from JSON string to array, return `{ data: CoffeeEntry[] }` with 200. (2) `POST /` -- validate required fields (name, grindLevel, doseGrams, brewTimeSeconds), accept client-generated `id`, set `created_at`/`updated_at` to `new Date().toISOString()`, insert row with parameterized query, stringify `blendComponents` for the `blend_components` column, return `{ data: CoffeeEntry }` with 201. (3) `GET /:id` -- lookup by id, return `{ data: CoffeeEntry }` with 200 or `{ error: "Coffee entry not found" }` with 404. (4) `PUT /:id` -- verify row exists (404 if not), update all mutable fields, set `updated_at` to now, return `{ data: CoffeeEntry }` with 200. (5) `DELETE /:id` -- verify row exists (404 if not), delete row, return 204 no body. All queries must use parameterized statements (`execute({ sql, args })`). All handlers must map between camelCase (JSON) and snake_case (DB columns). | backend-engineer | M002 | `backend/src/routes/coffees.router.ts` with all 5 route handlers | pending |
| M004 | Integrate router + middleware into server.ts | Update `backend/src/server.ts`: (1) Add `import cors from 'cors'` and mount `cors()` middleware (allow `http://localhost:4200` in dev, restrict in production). (2) Add `express.json()` body parser before routes. (3) Import and call `initDb()` at startup (wrap `app.listen` in an async IIFE that awaits `initDb()` first). (4) Import the coffees router from `./routes/coffees.router` and mount it at `/api/v1/coffees`. (5) Keep the existing `/health` endpoint, static file serving, SPA fallback, and error handler. Ensure the route order is: json parser, cors, helmet, `/health`, `/api/v1/coffees` router, static files, SPA fallback, error handler. (6) Add `dotenv/config` import at the top (or `import 'dotenv/config'`) so `.env` is loaded in dev. | backend-engineer | M003 | Updated `backend/src/server.ts` that boots, connects to Turso, and serves all API routes | pending |
| M005 | Create backend .env.example and update .gitignore | Create `backend/.env.example` with placeholder values for `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `PORT`. Ensure `backend/.env` is listed in the root `.gitignore` (or `backend/.gitignore`). Verify no secrets are committed. | backend-engineer | None | `backend/.env.example`, updated `.gitignore` | pending |

---

## Phase 2: Frontend Migration (CoffeeService + Component Updates)

**Priority:** High
**Status:** pending

Depends on Phase 1 (the API must exist for HttpClient calls to succeed).

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| M006 | Add provideHttpClient to app.config.ts | Update `frontend/src/app/app.config.ts`: import `provideHttpClient` from `@angular/common/http` and add it to the `providers` array alongside the existing `provideRouter(routes)` and `provideAnimations()`. No other changes to this file. | backend-engineer | None | Updated `app.config.ts` with `provideHttpClient()` in providers | pending |
| M007 | Add Angular dev proxy configuration | Create `frontend/proxy.conf.json` with a proxy rule that forwards `/api/*` and `/health` requests to `http://localhost:3000`. Update `frontend/angular.json` to add `"proxyConfig": "proxy.conf.json"` under the `serve.options` path (or `serve.configurations.development`). This allows `ng serve` on port 4200 to forward API calls to the Express backend on port 3000 during development. | backend-engineer | None | `frontend/proxy.conf.json`, updated `angular.json` serve config | pending |
| M008 | Migrate CoffeeService from localStorage to HttpClient | Rewrite `frontend/src/app/services/coffee.service.ts`. Remove all `localStorage` read/write logic (`loadFromStorage`, `saveToStorage`, `STORAGE_KEY` constant). Inject `HttpClient`. On construction, call a private `loadAll()` method that issues `GET /api/v1/coffees` and pushes `response.data` into the `BehaviorSubject`. Change method signatures: `addCoffee(payload)` returns `Observable<CoffeeEntry>` -- POSTs to `/api/v1/coffees` with `{ ...payload, id: crypto.randomUUID() }`, calls `loadAll()` on success via `tap`, returns the created entry. `updateCoffee(id, payload)` returns `Observable<CoffeeEntry>` -- PUTs to `/api/v1/coffees/:id`, calls `loadAll()` on success. `deleteCoffee(id)` returns `Observable<void>` -- DELETEs `/api/v1/coffees/:id`, calls `loadAll()` on success. Keep `getCoffeeById(id)` synchronous (reads from BehaviorSubject current value). Keep `filteredCoffees$(query$)` unchanged. Keep `coffees$` unchanged. The `loadAll()` method should map the API response shape `{ data: CoffeeEntry[] }` to extract the array. | backend-engineer | M004, M006, M007 | Rewritten `coffee.service.ts` using HttpClient, no localStorage references | pending |
| M009 | Update LibraryPageComponent for async delete | Update `frontend/src/app/components/library-page/library-page.component.ts`. The `onDeleteConfirmed()` method currently calls `this.coffeeService.deleteCoffee(id)` synchronously (void return). After M008, `deleteCoffee` returns `Observable<void>`. Update to subscribe: `this.coffeeService.deleteCoffee(id).subscribe()`. Optionally add error handling in the subscribe error callback (e.g., `console.error`). No template changes needed. | backend-engineer | M008 | Updated `library-page.component.ts` with async delete subscription | pending |
| M010 | Update CoffeeFormPageComponent for async add/update | Update `frontend/src/app/components/coffee-form-page/coffee-form-page.component.ts`. The `onSubmit()` method currently calls `addCoffee()`/`updateCoffee()` synchronously and navigates to `/` on success. After M008, these return `Observable<CoffeeEntry>`. Update to subscribe: on `next` navigate to `/`, on `error` set `this.submitError`. Remove the try/catch block and replace with Observable subscribe pattern. Add a `submitting = false` flag: set `true` before subscribing, `false` in both `next` and `error` callbacks. Disable the submit button while `submitting` is true to prevent double-submission. | backend-engineer | M008 | Updated `coffee-form-page.component.ts` with async submit, loading guard | pending |
| M011 | Add loading state to LibraryPageComponent | Add a loading indicator to the library page that displays while the initial data fetch from the API is in progress. In `library-page.component.ts`, add a `loading = true` boolean. In `ngOnInit`, subscribe to `coffees$` (or use the existing `filteredCoffees$`) and set `loading = false` on first emission. In `library-page.component.html`, wrap the card grid in an `@if (loading)` / `@else` block: show a centered loading spinner or "Loading your coffees..." text when loading, show the card grid when loaded. Use design tokens for styling (accent color for the spinner, muted text for the message). Keep it simple -- a CSS-only spinner or text indicator is sufficient. | ui-designer | M008 | Updated `library-page.component.ts` and `.html` with loading state | pending |

---

## Phase 3: Deployment Configuration (Vercel)

**Priority:** Medium
**Status:** pending

Depends on Phases 1 and 2 being functional.

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| M012 | Create Vercel serverless entry point | Create `api/index.ts` at the project root. This file imports the Express `app` from the backend and re-exports it for Vercel's serverless function runtime. Contents: `import app from '../backend/src/server';` then `export default app;`. Ensure the backend `server.ts` exports `app` as a default export (it already does: `export default app`). The file must work with `@vercel/node` builder. Verify that `app.listen()` is only called when NOT running on Vercel (check for `process.env.VERCEL` or similar -- conditionally call `app.listen` only if not in serverless mode). Update `backend/src/server.ts` to conditionally call `app.listen()`: wrap the listen call in `if (!process.env.VERCEL) { ... }`. | devops-pipeline-architect | M004 | `api/index.ts` serverless entry, updated `server.ts` with conditional listen | pending |
| M013 | Create vercel.json configuration | Create `vercel.json` at the project root per ARCHITECTURE.md Section 13.1. Define builds: `api/index.ts` with `@vercel/node`, and `frontend/dist/coffeecup/browser/**` with `@vercel/static`. Define routes: `/api/(.*)` and `/health` forward to `/api/index.ts`, all other paths `/(.*)`serve from `frontend/dist/coffeecup/browser/$1`. Ensure the Angular SPA fallback works for client-side routing. | devops-pipeline-architect | M012 | `vercel.json` at project root | pending |
| M014 | Create DEPLOYMENT.md for Vercel | Update or create `DEPLOYMENT.md` at the project root documenting: (1) Prerequisites (Vercel account, Turso database + auth token, Node.js 20). (2) Environment variables to set in Vercel dashboard (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`). (3) Local dev workflow (run backend with `npm run dev`, run frontend with `ng serve` -- proxy forwards API calls). (4) Build steps before deploying (`cd frontend && npm run build`). (5) Deploy commands (`vercel` for preview, `vercel --prod` for production). (6) How the `vercel.json` routing works. Keep it concise and practical. | devops-pipeline-architect | M013 | `DEPLOYMENT.md` at project root | pending |

---

## Phase 4: Tests

**Priority:** High
**Status:** pending

Tests validate the migration. Service tests depend on the new service; API tests depend on the API routes.

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| M015 | Update CoffeeService unit tests for HttpClient | Rewrite `frontend/src/app/services/coffee.service.spec.ts`. The existing tests mock `localStorage`. Replace with `HttpClientTestingModule` (`provideHttpClientTesting`) and `HttpTestingController`. Test: (1) On construction, `loadAll()` fires `GET /api/v1/coffees` and populates `coffees$`. (2) `addCoffee(payload)` sends `POST /api/v1/coffees` with correct body including a UUID `id`, then re-fetches via `GET`. (3) `updateCoffee(id, payload)` sends `PUT /api/v1/coffees/:id`, then re-fetches. (4) `deleteCoffee(id)` sends `DELETE /api/v1/coffees/:id`, then re-fetches. (5) `getCoffeeById(id)` returns entry from current BehaviorSubject value. (6) `filteredCoffees$` still filters by name/origin. (7) Error handling -- verify service does not crash on HTTP error. All tests must pass via `ng test`. | tdd-automation-agent | M008 | Rewritten `coffee.service.spec.ts`, all tests green | pending |
| M016 | Update LibraryPageComponent tests for async delete | Update `frontend/src/app/components/library-page/library-page.component.spec.ts`. The existing tests mock `CoffeeService` with synchronous methods. Update the mock so `deleteCoffee()` returns `of(undefined)` (an Observable). Verify `onDeleteConfirmed()` subscribes to the observable. Verify existing tests for search, edit navigation, and empty state still pass. All tests must pass via `ng test`. | tdd-automation-agent | M009, M015 | Updated `library-page.component.spec.ts`, all tests green | pending |
| M017 | Update CoffeeFormPageComponent tests for async submit | Update `frontend/src/app/components/coffee-form-page/coffee-form-page.component.spec.ts`. Update the mock `CoffeeService` so `addCoffee()` and `updateCoffee()` return Observables (`of(mockEntry)`). Test: (1) Valid submit in add mode calls `addCoffee` and navigates to `/` on Observable completion. (2) Valid submit in edit mode calls `updateCoffee` and navigates. (3) Submit button is disabled while `submitting` is true. (4) HTTP error sets `submitError` message. (5) Form validation tests remain unchanged. All tests must pass via `ng test`. | tdd-automation-agent | M010, M015 | Updated `coffee-form-page.component.spec.ts`, all tests green | pending |
| M018 | Add integration tests for coffees REST API | Create `backend/src/routes/coffees.router.spec.ts` (or `backend/tests/coffees.test.ts`). Install `supertest` and `@types/supertest` as dev dependencies in backend. Test all five API endpoints against an in-memory or test Turso database: (1) `POST /api/v1/coffees` creates entry, returns 201. (2) `GET /api/v1/coffees` returns all entries ordered by `created_at DESC`. (3) `GET /api/v1/coffees/:id` returns single entry or 404. (4) `PUT /api/v1/coffees/:id` updates entry or 404. (5) `DELETE /api/v1/coffees/:id` deletes entry (204) or 404. (6) Validation: POST with missing `name` returns 400. Test the snake_case-to-camelCase mapping in responses. For test isolation, either use a separate test database URL or mock the `db` module. Add a `test` npm script to `backend/package.json`. | tdd-automation-agent | M003 | `coffees.router.spec.ts` or equivalent, test script in package.json, all tests green | pending |

---

## Dependency Graph

```
Phase 1 (Backend API):

  M001 (install deps) ──── M002 (db.ts) ──── M003 (router) ──── M004 (server.ts integration)
  M005 (.env.example) -- independent, no blockers

Phase 2 (Frontend Migration):

  M006 (provideHttpClient) ─────────────────────────┐
  M007 (proxy.conf.json) ───────────────────────────┤
  M004 (server.ts) ─────────────────────────────────┤
                                                     ├── M008 (CoffeeService rewrite)
                                                     │       │
                                                     │       ├── M009 (LibraryPage async delete)
                                                     │       ├── M010 (FormPage async submit)
                                                     │       └── M011 (loading state)

Phase 3 (Deployment):

  M004 (server.ts) ──── M012 (api/index.ts) ──── M013 (vercel.json) ──── M014 (DEPLOYMENT.md)

Phase 4 (Tests):

  M008 ──── M015 (CoffeeService tests)
  M009 + M015 ──── M016 (LibraryPage tests)
  M010 + M015 ──── M017 (FormPage tests)
  M003 ──── M018 (API integration tests)
```

---

## Agent Assignment Summary

| Agent | Assigned Tasks |
|-------|---------------|
| **backend-engineer** | M001, M002, M003, M004, M005, M006, M007, M008, M009, M010 |
| **ui-designer** | M011 |
| **devops-pipeline-architect** | M012, M013, M014 |
| **tdd-automation-agent** | M015, M016, M017, M018 |

---

## Key Migration Notes

- **Data model is wider than ARCHITECTURE.md v2.0 schema.** The actual `CoffeeEntry` interface includes `roastLevel` (RoastLevel union type), `coffeeType` (CoffeeType union type), and `blendComponents` (BlendComponent[]). These must be included in the DB schema as `roast_level TEXT`, `coffee_type TEXT`, and `blend_components TEXT` (JSON-serialized array). The router must serialize/deserialize `blendComponents` when writing/reading rows.
- **grindLevel range is 1-30** in the actual code (not 1-10 as stated in the architecture doc). The DB column `grind_level INTEGER` has no CHECK constraint -- validation is at the API layer.
- **Express version is 5** (not 4 as stated in ARCHITECTURE.md). Express 5 uses `app.use()` for catch-all rather than `app.get('*')` because Express 5 requires named wildcards. The existing server already handles this correctly.
- **Synchronous to async migration.** The current `addCoffee`, `updateCoffee`, and `deleteCoffee` are synchronous (return `CoffeeEntry`/`void`). After migration they return `Observable`s. Every call site must subscribe: `LibraryPageComponent.onDeleteConfirmed()` and `CoffeeFormPageComponent.onSubmit()`.
- **No component UI changes** are required except the loading state in M011. All cards, forms, animations, SCSS, and routing remain untouched.
- **Existing test files** exist for `CoffeeService`, `SearchService`, `CoffeeCardComponent`, `CoffeeFormPageComponent`, `LibraryPageComponent`, `StarRatingComponent`, `SearchBarComponent`, and `AppComponent`. Only the service and smart-component tests need updating (M015-M017). Presentational component tests are unaffected.
