# Architecture Document: CoffeeCup

## 1. Overview

CoffeeCup is a personal coffee recipe manager — a single-page web application that allows coffee enthusiasts to create, manage, and search espresso machine profiles for each coffee bean they use. In v2, all data is persisted in a **Turso** (distributed SQLite via libSQL) cloud database, owned and accessed exclusively by the Express backend over a REST API. The Angular frontend communicates with that API via `HttpClient`; it holds no persistent state of its own.

The system is composed of two deployed units: a static Angular SPA served from Vercel's CDN, and an Express application exposed as a Vercel serverless function that handles all API traffic and database I/O.

### Design Philosophy

- **API-backed persistence.** The Express backend owns all data. The frontend is a pure consumer of a REST API — it never writes directly to any storage medium.
- **Thin backend, fat client.** Express provides CRUD routes, a health endpoint, and the libSQL connection. It contains no business logic beyond mapping HTTP to database operations.
- **Component-driven UI.** Angular standalone components with a clear hierarchy; no NgModules except the root bootstrap.
- **Reactive state via RxJS BehaviorSubject.** A single `CoffeeService` owns all in-memory state and exposes observables. After every mutation the service re-fetches from the API and pushes the updated list into the `BehaviorSubject`. Components never mutate state directly.
- **Design-token-based theming.** All colors, spacing, and typography are expressed as CSS custom properties defined once in a global `_tokens.scss` partial, consumed everywhere.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      Angular SPA                          │  │
│  │                                                            │  │
│  │  ┌────────────┐   ┌─────────────┐   ┌─────────────┐       │  │
│  │  │  AppShell  │   │CoffeeLibrary│   │CoffeeForm   │       │  │
│  │  │ (layout,   │──▶│ (card grid, │   │(add / edit  │       │  │
│  │  │  nav)      │   │  search bar)│   │ modal/page) │       │  │
│  │  └────────────┘   └──────┬──────┘   └──────┬──────┘       │  │
│  │                          │                 │               │  │
│  │              ┌───────────▼─────────────────▼──────┐        │  │
│  │              │           CoffeeService             │        │  │
│  │              │  (BehaviorSubject<CoffeeEntry[]>)   │        │  │
│  │              │   CRUD methods → HttpClient calls   │        │  │
│  │              └───────────────────────────────────┘        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
          │  HTTPS  /api/v1/coffees  (JSON REST)
          ▼
┌──────────────────────────────────────────┐
│     Node.js / Express (Vercel Function)  │
│                                          │
│  GET    /health                          │
│  GET    /api/v1/coffees                  │
│  POST   /api/v1/coffees                  │
│  GET    /api/v1/coffees/:id              │
│  PUT    /api/v1/coffees/:id              │
│  DELETE /api/v1/coffees/:id              │
│  GET    *  → Angular SPA (static)        │
└──────────────────┬───────────────────────┘
                   │  libSQL (HTTPS)
                   ▼
┌──────────────────────────────────────────┐
│         Turso — Distributed SQLite       │
│                                          │
│  table: coffee_entries                   │
└──────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Frontend framework | Angular | 17+ | User-specified. Standalone component architecture removes NgModule boilerplate. Built-in DI, RxJS, and animations make it well-suited for a reactive, animated UI. |
| Language | TypeScript | 5.x | Angular's native language. Strict typing enforces data-model correctness across the entire codebase. |
| Styling | SCSS + CSS custom properties | — | Angular's per-component `styleUrls` with SCSS enables scoped styles while a global `_tokens.scss` file provides shared design tokens without a CSS-in-JS overhead. |
| Animations | Angular Animations (`@angular/animations`) | 17+ | First-class Angular integration. Trigger-based state machines map cleanly to card enter/leave transitions. No third-party library needed. |
| State management | RxJS `BehaviorSubject` inside a service | 7.x | Sufficient for a single-entity store of this complexity. Avoids the overhead of NgRx/Akita/Signals store for a personal app. Upgrade path to Angular Signals is straightforward. |
| HTTP client | Angular `HttpClient` | 17+ | Built-in Angular module for HTTP communication. Integrates cleanly with RxJS Observables and provides interceptor support. |
| Build toolchain | Angular CLI + Vite (esbuild) | 17+ | Angular 17 ships with esbuild by default via the `@angular-devkit/build-angular` builder, giving fast dev-server HMR and optimized production bundles. |
| Backend runtime | Node.js | 20 LTS | Stable, widely deployed LTS release. |
| Backend framework | Express | 4.x | Minimal footprint for REST API + health endpoint + static file serving. |
| Database | Turso (distributed SQLite via libSQL) | latest | Serverless-native SQLite with global replication. Zero infrastructure to manage; connects via `@libsql/client` over HTTPS. Ideal for a personal app with low write volume. |
| Database client | `@libsql/client` | latest | Official Turso/libSQL client for Node.js. Accepts `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from environment variables. |
| Deployment | Vercel | — | Zero-configuration deployment for static frontends and Node.js serverless functions. The Angular build is served from Vercel's CDN; the Express API runs as a serverless function. |
| Package manager | npm | 10+ | Default; consistent with Angular CLI scaffolding. |
| Fonts | Google Fonts — Outfit | — | Geometric sans-serif with a warm, modern personality that matches the specialty-coffee aesthetic. Falls back to Inter, then system-ui. |

---

## 4. Frontend Architecture

### 4.1 Angular Configuration

- **Standalone components** throughout — no `NgModule` declarations except the root bootstrap in `main.ts`.
- **Strict mode** enabled in `tsconfig.json` (`"strict": true`).
- **Angular Router** configured with `provideRouter()` in `app.config.ts`.
- **Angular Animations** enabled globally via `provideAnimations()` in `app.config.ts`.
- **HttpClient** provided globally via `provideHttpClient()` in `app.config.ts`.
- **SCSS** as the default style preprocessor (`--style=scss` at project generation).

### 4.2 Application Routes

| Path | Component | Description |
|---|---|---|
| `/` | `LibraryPageComponent` | Default view — coffee card grid with search bar |
| `/add` | `CoffeeFormPageComponent` | Full-page form to create a new coffee entry |
| `/edit/:id` | `CoffeeFormPageComponent` | Same form component, pre-populated for editing |
| `**` | redirect to `/` | 404 fallback |

### 4.3 Component Hierarchy

```
AppComponent                         (root shell — toolbar, router outlet)
├── ToolbarComponent                 (app title, tagline)
└── <router-outlet>
    ├── LibraryPageComponent         (route: /)
    │   ├── SearchBarComponent       (search input, filter chips)
    │   ├── CoffeeCardGridComponent  (responsive grid wrapper, empty state)
    │   │   └── CoffeeCardComponent  (* — one per entry; shows key stats)
    │   │       └── StarRatingComponent (read-only star display)
    │   └── FabButtonComponent       (floating "+" button → /add)
    └── CoffeeFormPageComponent      (route: /add, /edit/:id)
        ├── FormFieldComponent       (reusable labelled input/textarea wrapper)
        ├── GrindSliderComponent     (custom range input, 1–10, with tick marks)
        └── StarRatingComponent      (interactive star picker for rating field)
```

### 4.4 Component Inventory

| Component | Selector | Responsibility |
|---|---|---|
| `AppComponent` | `app-root` | Root shell. Declares `<app-toolbar>` and `<router-outlet>`. Applies global layout CSS class for the dark background. |
| `ToolbarComponent` | `app-toolbar` | Displays the CoffeeCup logo/wordmark and top navigation. Contains no business logic. |
| `LibraryPageComponent` | `app-library-page` | Orchestrates the main view. Subscribes to `CoffeeService.filteredCoffees$` and passes data down to the card grid. Handles delete confirmation. |
| `SearchBarComponent` | `app-search-bar` | Controlled text input that emits a `searchQuery` string on every keystroke via `@Output EventEmitter`. No direct service access — purely presentational. |
| `CoffeeCardGridComponent` | `app-coffee-card-grid` | Receives a `CoffeeEntry[]` input. Renders the responsive CSS grid. Shows empty-state illustration when the array is empty. Applies `@angular/animations` list animation trigger to the grid host. |
| `CoffeeCardComponent` | `app-coffee-card` | Receives a single `CoffeeEntry` input. Displays name, origin, grind, dose, brew time, rating, and truncated notes. Emits `edit` and `delete` output events. Handles its own hover state via Angular animation trigger. |
| `StarRatingComponent` | `app-star-rating` | Dual-mode (read-only / interactive) star widget. In interactive mode emits `ratingChange: number`. In read-only mode renders filled/empty stars from a numeric input. |
| `FabButtonComponent` | `app-fab-button` | Floating action button fixed to the bottom-right. Navigates to `/add` on click. Has a scale/pulse Angular animation on mount. |
| `CoffeeFormPageComponent` | `app-coffee-form-page` | Smart component. Reads `:id` from route params. If id present, calls `CoffeeService.getCoffeeById()` and patches form. On submit calls `addCoffee()` or `updateCoffee()`. On cancel navigates back to `/`. Uses Angular `ReactiveFormsModule`. |
| `FormFieldComponent` | `app-form-field` | Presentational wrapper for a label + projected `<input>` or `<textarea>`. Displays validation error messages passed via input. |
| `GrindSliderComponent` | `app-grind-slider` | Wraps a native `<input type="range" min="1" max="10">` with custom SCSS styling and numeric tick marks. Implements `ControlValueAccessor` so it integrates seamlessly with Reactive Forms. |

### 4.5 Service Inventory

#### `CoffeeService`

File: `src/app/services/coffee.service.ts`

Singleton, provided in root (`providedIn: 'root'`).

Responsibilities:
- Owns the master `BehaviorSubject<CoffeeEntry[]>` (`_coffees$`).
- Exposes a read-only `coffees$: Observable<CoffeeEntry[]>` from `_coffees$.asObservable()`.
- Exposes `filteredCoffees$(query: Observable<string>): Observable<CoffeeEntry[]>` — combines the master list with a search query observable using `combineLatest` and `map`, filtering by name and origin (case-insensitive contains).
- On construction, calls `loadAll()` which issues a `GET /api/v1/coffees` request via `HttpClient` and pushes the result into `_coffees$`.
- After every mutating operation (`addCoffee`, `updateCoffee`, `deleteCoffee`), re-calls `loadAll()` to keep the `BehaviorSubject` in sync with the server.
- Generates UUIDs for new entries client-side using `crypto.randomUUID()` before sending them to the API, ensuring the id is known synchronously for optimistic UI updates.

Public API (all mutation methods return Observables):

```typescript
// Returns all coffee entries as an observable (populated from the API on init)
coffees$: Observable<CoffeeEntry[]>

// Returns filtered entries based on a live search query observable
filteredCoffees$(query$: Observable<string>): Observable<CoffeeEntry[]>

// POSTs a new entry to the API; refreshes the list on success
addCoffee(payload: CoffeeEntryPayload): Observable<CoffeeEntry>

// PUTs an updated entry to the API; refreshes the list on success
updateCoffee(id: string, payload: CoffeeEntryPayload): Observable<CoffeeEntry>

// DELETEs an entry from the API; refreshes the list on success
deleteCoffee(id: string): Observable<void>

// Returns a single entry from the in-memory BehaviorSubject (synchronous lookup)
getCoffeeById(id: string): CoffeeEntry | undefined
```

#### `SearchService`

File: `src/app/services/search.service.ts`

Singleton, provided in root.

Responsibilities:
- Owns a `BehaviorSubject<string>` for the current search query (default: empty string).
- Exposes `query$: Observable<string>` with `debounceTime(200)` and `distinctUntilChanged` applied.
- Exposes `setQuery(query: string): void` — trims input before calling `BehaviorSubject.next()`.
- `LibraryPageComponent` injects both `CoffeeService` and `SearchService`, combines them via `CoffeeService.filteredCoffees$(searchService.query$)`.

### 4.6 State Flow

```
App initializes
  → CoffeeService constructor calls loadAll()
    → HttpClient GET /api/v1/coffees
      → _coffees$.next(response)
        → LibraryPageComponent template async-pipes coffees$
          → CoffeeCardGridComponent renders cards

User types in SearchBarComponent
  → SearchBarComponent emits @Output searchQuery
    → LibraryPageComponent calls SearchService.setQuery(query)
      → SearchService._query$.next(query)
        → CoffeeService.filteredCoffees$(query$) recalculates in memory
          → LibraryPageComponent template async-pipes the result
            → CoffeeCardGridComponent re-renders with filtered cards

User creates/edits/deletes a coffee
  → CoffeeFormPageComponent or LibraryPageComponent calls CoffeeService mutation method
    → HttpClient POST/PUT/DELETE /api/v1/coffees[/:id]
      → On success: CoffeeService calls loadAll() to refresh _coffees$
        → All subscribed components re-render automatically
```

---

## 5. Backend Architecture

The Express server has three responsibilities: expose a REST API for coffee entries, serve the Angular production build as static files, and expose a `/health` endpoint. All data access goes through a libSQL client connected to Turso.

### 5.1 Express Application Structure

File: `backend/src/server.ts` (compiled to `backend/dist/server.js`)

```
Startup sequence:
  1. Read PORT, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN from process.env
  2. Create libSQL client: createClient({ url, authToken })
  3. Run database initialisation: CREATE TABLE IF NOT EXISTS coffee_entries (...)
  4. Mount express.json() body parser
  5. Mount cors() middleware (permissive in dev; restricted to Vercel origin in prod)
  6. Mount helmet() for security headers
  7. Register GET /health route
  8. Register /api/v1/coffees router (see Section 5.2)
  9. Mount express.static() pointing at ../frontend/dist/coffeecup/browser
 10. Register catch-all GET * → send index.html (SPA fallback)
 11. Register global error handler (structured JSON logging)
 12. app.listen(PORT)
```

### 5.2 libSQL / Turso Setup

Install:
```
npm install @libsql/client
```

Environment variables (never committed; set in Vercel dashboard and local `.env`):

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | libsql:// or https:// URL for the Turso database, e.g. `libsql://coffeecup-<org>.turso.io` |
| `TURSO_AUTH_TOKEN` | JWT bearer token issued by Turso for the database. Never exposed to the client. |

Initialisation (runs once on server startup):

```typescript
// Pseudocode — not runnable
import { createClient } from '@libsql/client';

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS coffee_entries (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    origin            TEXT,
    grind_level       INTEGER NOT NULL,
    dose_grams        REAL NOT NULL,
    brew_time_seconds INTEGER NOT NULL,
    notes             TEXT,
    rating            INTEGER,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
`);
```

### 5.3 Express Routes

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/health` | inline | Returns `{ status: "ok", timestamp: ISO8601 }` with HTTP 200. Used for uptime monitoring and Vercel health checks. |
| `GET` | `/api/v1/coffees` | `coffees.router` | Returns all coffee entries from the database ordered by `created_at DESC`. |
| `POST` | `/api/v1/coffees` | `coffees.router` | Inserts a new coffee entry. Client provides the UUID. |
| `GET` | `/api/v1/coffees/:id` | `coffees.router` | Returns a single entry by `id`. 404 if not found. |
| `PUT` | `/api/v1/coffees/:id` | `coffees.router` | Replaces all mutable fields of an existing entry. 404 if not found. |
| `DELETE` | `/api/v1/coffees/:id` | `coffees.router` | Removes an entry by `id`. 404 if not found. |
| `GET` | `*` | `express.static` fallback | Serves `index.html` from the Angular build for SPA client-side routing. |

---

## 6. API Design

Base path: `/api/v1`

All requests and responses use `Content-Type: application/json`. All timestamps are ISO 8601 strings (UTC).

### 6.1 List All Coffees

```
GET /api/v1/coffees
```

**Response 200:**
```typescript
interface ListCoffeesResponse {
  data: CoffeeEntry[];
}
```

### 6.2 Get a Single Coffee

```
GET /api/v1/coffees/:id
```

**Response 200:**
```typescript
interface GetCoffeeResponse {
  data: CoffeeEntry;
}
```

**Response 404:**
```typescript
interface ErrorResponse {
  error: string;  // e.g. "Coffee entry not found"
}
```

### 6.3 Create a Coffee

```
POST /api/v1/coffees
```

**Request body:**
```typescript
interface CreateCoffeeRequest {
  id:               string;  // UUID v4 generated client-side via crypto.randomUUID()
  name:             string;  // required, max 100 chars
  origin:           string | null;
  grindLevel:       number;  // integer 1–10
  doseGrams:        number;  // positive float
  brewTimeSeconds:  number;  // positive integer
  notes:            string | null;  // max 1000 chars
  rating:           number | null;  // integer 1–5 or null
}
```

**Response 201:**
```typescript
interface CreateCoffeeResponse {
  data: CoffeeEntry;
}
```

**Response 400:**
```typescript
interface ErrorResponse {
  error: string;  // e.g. "name is required"
}
```

### 6.4 Update a Coffee

```
PUT /api/v1/coffees/:id
```

**Request body:**
```typescript
interface UpdateCoffeeRequest {
  name:             string;
  origin:           string | null;
  grindLevel:       number;
  doseGrams:        number;
  brewTimeSeconds:  number;
  notes:            string | null;
  rating:           number | null;
}
```

**Response 200:**
```typescript
interface UpdateCoffeeResponse {
  data: CoffeeEntry;  // includes server-updated updatedAt timestamp
}
```

**Response 404:**
```typescript
interface ErrorResponse {
  error: string;
}
```

### 6.5 Delete a Coffee

```
DELETE /api/v1/coffees/:id
```

**Response 204:** No body.

**Response 404:**
```typescript
interface ErrorResponse {
  error: string;
}
```

### 6.6 Health Check

```
GET /health
```

**Response 200:**
```typescript
interface HealthResponse {
  status:    "ok";
  timestamp: string;  // ISO 8601 e.g. "2026-03-26T10:00:00.000Z"
}
```

---

## 7. Data Models

### 7.1 TypeScript Interfaces

File: `frontend/src/app/models/coffee.models.ts`

```typescript
/**
 * A fully persisted coffee entry, including system-generated fields.
 */
export interface CoffeeEntry {
  id: string;              // UUID v4, generated by crypto.randomUUID() on the client
  name: string;            // e.g. "Brazilian Santos" — required, max 100 chars
  origin: string | null;   // e.g. "Light Roast, Brazil" — optional
  grindLevel: number;      // integer 1–10 inclusive
  doseGrams: number;       // positive float, e.g. 19.0
  brewTimeSeconds: number; // positive integer, e.g. 35
  notes: string | null;    // free text tasting notes — optional, max 1000 chars
  rating: number | null;   // integer 1–5 or null if unrated
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}

/**
 * The shape of form data submitted when creating or editing an entry.
 * Omits system-generated fields (id, createdAt, updatedAt).
 */
export interface CoffeeEntryPayload {
  name: string;
  origin: string | null;
  grindLevel: number;
  doseGrams: number;
  brewTimeSeconds: number;
  notes: string | null;
  rating: number | null;
}
```

### 7.2 Form Validation Rules

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | Min length 1, max length 100 |
| `origin` | string | No | Max length 100 |
| `grindLevel` | number | Yes | Integer, min 1, max 10 |
| `doseGrams` | number | Yes | Positive float, min 1, max 50 |
| `brewTimeSeconds` | number | Yes | Positive integer, min 5, max 120 |
| `notes` | string | No | Max length 1000 |
| `rating` | number | No | Integer, min 1, max 5 |

---

## 8. Database Schema

### 8.1 SQLite Table DDL

```sql
CREATE TABLE IF NOT EXISTS coffee_entries (
  id                TEXT    PRIMARY KEY,
  name              TEXT    NOT NULL,
  origin            TEXT,
  grind_level       INTEGER NOT NULL,
  dose_grams        REAL    NOT NULL,
  brew_time_seconds INTEGER NOT NULL,
  notes             TEXT,
  rating            INTEGER,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);
```

### 8.2 Column Reference

| Column | SQLite Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| `id` | TEXT | No | PRIMARY KEY | UUID v4 string, e.g. `"a1b2c3d4-..."` |
| `name` | TEXT | No | NOT NULL | Max 100 chars enforced at the API layer |
| `origin` | TEXT | Yes | — | Nullable; omitted entries stored as SQL NULL |
| `grind_level` | INTEGER | No | NOT NULL | 1–10; range enforced at the API layer |
| `dose_grams` | REAL | No | NOT NULL | Stored as floating-point, e.g. `19.0` |
| `brew_time_seconds` | INTEGER | No | NOT NULL | Positive integer, e.g. `35` |
| `notes` | TEXT | Yes | — | Max 1000 chars enforced at the API layer |
| `rating` | INTEGER | Yes | — | 1–5 or NULL; enforced at the API layer |
| `created_at` | TEXT | No | NOT NULL | ISO 8601 UTC, set by the server on insert |
| `updated_at` | TEXT | No | NOT NULL | ISO 8601 UTC, updated by the server on PUT |

### 8.3 Indexes

| Index | Column(s) | Rationale |
|---|---|---|
| PRIMARY KEY | `id` | Implicit unique index on the primary key. Used by all single-entry lookups. |
| `idx_coffee_entries_created_at` | `created_at DESC` | Speeds up the default list query which orders by creation date. |
| `idx_coffee_entries_name` | `name` | Supports future server-side name search if client-side filtering is moved to the API. |

```sql
CREATE INDEX IF NOT EXISTS idx_coffee_entries_created_at ON coffee_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coffee_entries_name       ON coffee_entries (name);
```

### 8.4 Column Naming Convention

The SQLite columns use `snake_case` (`grind_level`, `dose_grams`, etc.) while the TypeScript interfaces and JSON API use `camelCase` (`grindLevel`, `doseGrams`). The Express route handlers are responsible for mapping between the two conventions when reading rows and constructing API responses.

### 8.5 Row Example

```json
{
  "id":                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name":              "Brazilian Santos",
  "origin":            "Light Roast, Brazil",
  "grind_level":       6,
  "dose_grams":        19.0,
  "brew_time_seconds": 35,
  "notes":             "Sweet, low acidity. Chocolatey finish.",
  "rating":            4,
  "created_at":        "2026-03-01T08:00:00.000Z",
  "updated_at":        "2026-03-15T09:30:00.000Z"
}
```

---

## 9. Authentication & Authorization

CoffeeCup v2 remains a single-user personal tool with no user accounts or login. Authentication and authorization are out of scope for the data API.

**Access control for the API:**

- The Express API is deployed as a Vercel serverless function. All `/api/*` routes are same-origin from the perspective of the Angular SPA (both served under the same Vercel deployment URL), so no cross-origin credentials are exchanged in production.
- The Turso auth token (`TURSO_AUTH_TOKEN`) is a server-side secret stored in Vercel environment variables. It is never embedded in the Angular build, never returned in any API response, and never logged.
- In development, the API runs on `localhost:3000` while the Angular dev server runs on `localhost:4200`. A CORS middleware (`cors` npm package) is configured to allow `http://localhost:4200` in the `development` environment only. In production (Vercel), CORS is either restricted to the Vercel deployment origin or omitted entirely because the same-origin policy applies.

**Security measures that remain relevant:**

- All user-supplied text is treated as untrusted input and rendered via Angular's template interpolation (`{{ }}`) which escapes HTML by default, preventing XSS.
- `innerHTML` binding is not used anywhere.
- The Express server uses parameterised libSQL queries (the `@libsql/client` `execute({ sql, args })` API) for all database operations, preventing SQL injection.
- The Express server sets HTTP security headers via `helmet` middleware (v7).

---

## 10. Security Notes

| Concern | Mitigation |
|---|---|
| XSS | Angular template interpolation escapes all user-supplied content by default. No `innerHTML` bindings. |
| SQL injection | All database queries use parameterised statements via `@libsql/client`'s `execute({ sql, args })` API. No string-concatenated SQL. |
| CSRF | Not applicable — no session cookies or cookie-based auth. |
| Turso auth token exposure | Token is stored exclusively in Vercel environment variables and the local `.env` file (gitignored). It is never included in the Angular build or any API response. |
| CORS | In development: `cors()` middleware allows `localhost:4200`. In production: CORS headers are either restricted to the Vercel deployment origin or omitted (same-origin). Never use a wildcard (`*`) origin in production. |
| Content injection | `helmet()` sets a strict CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer` on all responses. |
| Sensitive data exposure | No PII is collected. The `.env` file containing secrets is listed in `.gitignore`. |
| Dependency vulnerabilities | `npm audit` should be run before deployment; address any high/critical findings. |
| HTTPS | Vercel enforces HTTPS on all deployments. Express itself does not handle TLS in this architecture. |
| Rate limiting | For a personal app, no rate limiting is required in v2. If the API is ever made public, add `express-rate-limit` middleware before the `/api` router. |

---

## 11. Color Palette and Design Tokens

File: `frontend/src/styles/_tokens.scss`

```scss
:root {
  // --- Background & Surface ---
  --color-bg-primary:     #2C1810;  // Page background — deep espresso brown
  --color-bg-surface:     #3D2314;  // Card surface — slightly lighter brown
  --color-bg-elevated:    #4E2E1A;  // Hover state, modal backdrop

  // --- Text ---
  --color-text-primary:   #F5ECD7;  // Cream white — primary readable text
  --color-text-secondary: #C4A882;  // Warm tan — secondary/metadata text
  --color-text-muted:     #8A6A4A;  // Muted brown — placeholders, disabled

  // --- Accent ---
  --color-accent:         #D4860B;  // Amber — primary CTA, active states
  --color-accent-hover:   #E8A020;  // Lighter amber — hover on accent elements
  --color-accent-muted:   #7A4E0D;  // Dark amber — borders, subdued accents

  // --- Feedback ---
  --color-success:        #5A8A5A;  // Muted green
  --color-error:          #C0392B;  // Muted red for validation errors
  --color-star-filled:    #E8A020;  // Star rating — filled
  --color-star-empty:     #4E3020;  // Star rating — empty

  // --- Typography ---
  --font-family-primary:  'Outfit', 'Inter', system-ui, sans-serif;
  --font-size-xs:         0.75rem;   // 12px
  --font-size-sm:         0.875rem;  // 14px
  --font-size-base:       1rem;      // 16px
  --font-size-lg:         1.125rem;  // 18px
  --font-size-xl:         1.25rem;   // 20px
  --font-size-2xl:        1.5rem;    // 24px
  --font-size-3xl:        1.875rem;  // 30px
  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  // --- Spacing (4px base unit) ---
  --space-1:  0.25rem;   // 4px
  --space-2:  0.5rem;    // 8px
  --space-3:  0.75rem;   // 12px
  --space-4:  1rem;      // 16px
  --space-5:  1.25rem;   // 20px
  --space-6:  1.5rem;    // 24px
  --space-8:  2rem;      // 32px
  --space-10: 2.5rem;    // 40px
  --space-12: 3rem;      // 48px
  --space-16: 4rem;      // 64px

  // --- Border ---
  --border-radius-sm:     4px;
  --border-radius-md:     8px;
  --border-radius-lg:     12px;
  --border-radius-xl:     16px;
  --border-radius-full:   9999px;
  --border-color:         #4E2E1A;
  --border-color-accent:  #7A4E0D;

  // --- Shadows ---
  --shadow-card:   0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-raised: 0 4px 16px rgba(0, 0, 0, 0.5);

  // --- Transitions ---
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms ease;
}
```

---

## 12. Animation Strategy

Angular's `@angular/animations` module is used for all transitions. No CSS keyframe animation libraries are introduced.

### 12.1 Animation Triggers Inventory

| Trigger Name | Host Element | States | Description |
|---|---|---|---|
| `cardEnterLeave` | `CoffeeCardComponent` | `void => *`, `* => void` | Cards slide in from the bottom (translateY 20px → 0) and fade in on enter; fade out and scale down on leave. Duration: 300ms ease-out enter, 200ms ease-in leave. |
| `listAnimation` | `CoffeeCardGridComponent` | `@cardEnterLeave` on each item | Uses `query` + `stagger(50ms)` so cards cascade in on initial load rather than all appearing simultaneously. |
| `fabPulse` | `FabButtonComponent` | `mounted` | Scale from 0 → 1 with a slight overshoot (cubic-bezier spring) on component initialization. |
| `pageSlide` | `router-outlet` host in `AppComponent` | route data `animation` token | Left/right slide between library and form views (translateX ±20px + opacity). |
| `formFieldError` | `FormFieldComponent` | `valid`, `invalid` | Error message slides down and fades in when a field becomes invalid; reverses on valid. Height animation via `style({ height: 0 })` → `animate('200ms', style({ height: '*' }))`. |

### 12.2 Animation File Location

Animations are defined as exported constants in dedicated files co-located with their host components, not inline in the component decorator, to keep decorators readable:

```
frontend/src/app/components/coffee-card/coffee-card.animations.ts
frontend/src/app/components/coffee-card-grid/coffee-card-grid.animations.ts
frontend/src/app/components/fab-button/fab-button.animations.ts
frontend/src/app/app.animations.ts
```

---

## 13. File and Directory Structure

```
CoffeeCup/
├── ARCHITECTURE.md
├── TASKS.md
├── DEPLOYMENT.md
├── vercel.json                                 # Vercel routing: SPA rewrites + API function
│
├── frontend/                                   # Angular 17 application
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   └── src/
│       ├── index.html
│       ├── main.ts                             # Bootstrap with provideRouter, provideAnimations, provideHttpClient
│       ├── styles.scss                         # Global resets, @import tokens/fonts
│       └── app/
│           ├── app.component.ts                # Root shell, router-outlet
│           ├── app.component.html
│           ├── app.component.scss
│           ├── app.animations.ts               # Page-level route animations
│           ├── app.config.ts                   # provideRouter, provideAnimations, provideHttpClient
│           ├── app.routes.ts                   # Route definitions
│           │
│           ├── models/
│           │   └── coffee.models.ts            # CoffeeEntry, CoffeeEntryPayload interfaces
│           │
│           ├── services/
│           │   ├── coffee.service.ts           # BehaviorSubject, CRUD via HttpClient
│           │   └── search.service.ts           # BehaviorSubject<string> for query
│           │
│           └── components/
│               ├── toolbar/
│               │   ├── toolbar.component.ts
│               │   ├── toolbar.component.html
│               │   └── toolbar.component.scss
│               │
│               ├── library-page/
│               │   ├── library-page.component.ts
│               │   ├── library-page.component.html
│               │   └── library-page.component.scss
│               │
│               ├── search-bar/
│               │   ├── search-bar.component.ts
│               │   ├── search-bar.component.html
│               │   └── search-bar.component.scss
│               │
│               ├── coffee-card-grid/
│               │   ├── coffee-card-grid.component.ts
│               │   ├── coffee-card-grid.component.html
│               │   ├── coffee-card-grid.component.scss
│               │   └── coffee-card-grid.animations.ts
│               │
│               ├── coffee-card/
│               │   ├── coffee-card.component.ts
│               │   ├── coffee-card.component.html
│               │   ├── coffee-card.component.scss
│               │   └── coffee-card.animations.ts
│               │
│               ├── coffee-form-page/
│               │   ├── coffee-form-page.component.ts
│               │   ├── coffee-form-page.component.html
│               │   └── coffee-form-page.component.scss
│               │
│               ├── form-field/
│               │   ├── form-field.component.ts
│               │   ├── form-field.component.html
│               │   └── form-field.component.scss
│               │
│               ├── grind-slider/
│               │   ├── grind-slider.component.ts
│               │   ├── grind-slider.component.html
│               │   └── grind-slider.component.scss
│               │
│               ├── star-rating/
│               │   ├── star-rating.component.ts
│               │   ├── star-rating.component.html
│               │   └── star-rating.component.scss
│               │
│               └── fab-button/
│                   ├── fab-button.component.ts
│                   ├── fab-button.component.html
│                   ├── fab-button.component.scss
│                   └── fab-button.animations.ts
│
├── backend/                                    # Node.js / Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts                           # Express app: libSQL init, routes, static serve
│       ├── db.ts                               # createClient() singleton, exported db instance
│       └── routes/
│           └── coffees.router.ts               # Express Router — all /api/v1/coffees handlers
│
└── api/
    └── index.ts                                # Vercel serverless function entry point
                                                # Imports and re-exports the Express app
```

### 13.1 `vercel.json` Structure

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/dist/coffeecup/browser/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.ts"
    },
    {
      "src": "/health",
      "dest": "/api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/coffeecup/browser/$1"
    }
  ]
}
```

All `/api/*` and `/health` requests are routed to the serverless Express function. All other paths are served from the pre-built Angular static output. The Angular router handles client-side navigation after the initial HTML load.

### 13.2 Global Styles Structure

```
frontend/src/
├── styles.scss             # Entry: imports tokens, resets, base typography
└── styles/
    ├── _tokens.scss        # All CSS custom properties (Section 11)
    ├── _reset.scss         # Box-sizing, margin reset, border-box
    └── _typography.scss    # Base font-face, body/heading defaults
```

---

## 14. Build and Run Instructions

### 14.1 Prerequisites

- Node.js 20 LTS
- npm 10+
- Angular CLI 17+: `npm install -g @angular/cli@17`
- Vercel CLI (for deployment): `npm install -g vercel`
- A Turso account with a database created and auth token issued

### 14.2 Environment Variables

Create `backend/.env` (do not commit this file):

```
TURSO_DATABASE_URL=libsql://coffeecup-<your-org>.turso.io
TURSO_AUTH_TOKEN=<your-turso-auth-token>
PORT=3000
```

For the Angular dev server, no environment variables are required — it proxies API calls to `localhost:3000`.

### 14.3 Frontend — Development

```bash
cd frontend
npm install
ng serve
# App available at http://localhost:4200
# Hot module reload enabled by default (esbuild builder)
# API calls proxied to http://localhost:3000 via proxy.conf.json
```

### 14.4 Frontend — Production Build

```bash
cd frontend
npm run build
# Output: frontend/dist/coffeecup/browser/
```

### 14.5 Backend — Development

```bash
cd backend
npm install
npm run dev
# Uses ts-node-dev for live reload
# Server on http://localhost:3000
# Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from .env
```

### 14.6 Backend — Production

```bash
cd backend
npm run build         # tsc → dist/server.js
node dist/server.js
```

### 14.7 Vercel Deployment

```bash
# First-time setup
vercel login
vercel link   # link to your Vercel project

# Set environment variables in Vercel (one-time)
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN

# Build the frontend before deploying
cd frontend && npm run build && cd ..

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

The Vercel deployment serves the pre-built Angular static assets from `frontend/dist/coffeecup/browser` and routes `/api/*` requests to the serverless Express function at `api/index.ts`.

### 14.8 Docker (Local Full-Stack)

Docker remains supported for local development and self-hosted deployment. The container bundles both the Angular build and the Express server.

```bash
docker build -t coffeecup:latest .
docker run \
  -e TURSO_DATABASE_URL=libsql://coffeecup-<your-org>.turso.io \
  -e TURSO_AUTH_TOKEN=<your-turso-auth-token> \
  -p 3000:3000 \
  coffeecup:latest
# App available at http://localhost:3000
```

### 14.9 Backend — Required npm Scripts (`backend/package.json`)

```json
{
  "scripts": {
    "dev":   "ts-node-dev --respawn src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### 14.10 Backend — Required Dependencies

```json
{
  "dependencies": {
    "@libsql/client": "^0.14.0",
    "cors":           "^2.8.5",
    "express":        "^4.19.0",
    "helmet":         "^7.1.0"
  },
  "devDependencies": {
    "@types/cors":      "^2.8.17",
    "@types/express":   "^4.17.21",
    "@types/node":      "^20.0.0",
    "ts-node-dev":      "^2.0.0",
    "typescript":       "^5.4.0"
  }
}
```

### 14.11 Frontend — Required Dependencies

```json
{
  "dependencies": {
    "@angular/animations":       "^17.0.0",
    "@angular/common":           "^17.0.0",
    "@angular/compiler":         "^17.0.0",
    "@angular/core":             "^17.0.0",
    "@angular/forms":            "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/router":           "^17.0.0",
    "rxjs":                      "^7.8.0",
    "zone.js":                   "^0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.0",
    "@angular/cli":                  "^17.0.0",
    "@angular/compiler-cli":         "^17.0.0",
    "typescript":                    "^5.2.0"
  }
}
```

---

## 15. Scalability and Future Considerations

| Concern | v2 Approach | Migration Path |
|---|---|---|
| Persistence | Turso (distributed SQLite via libSQL) — replaced localStorage | Already on a real database. Migrate to PostgreSQL 16 (via `pg` or Prisma) if relational query complexity or write throughput exceeds SQLite limits. The Express route handlers are the only layer that changes. |
| Multi-user | None (single user, no auth) | Add OAuth2/OIDC via Clerk or Auth0. Express gains JWT verification middleware. Each row in `coffee_entries` gains a `user_id TEXT NOT NULL` column. The `BehaviorSubject` model in `CoffeeService` is unchanged. |
| Backend database (previous localStorage) | Replaced by Turso in v2 | N/A — migration complete. |
| Image support | None | Allow a photo of the coffee bag. Upload to S3-compatible object storage (e.g., Cloudflare R2). Store only the object URL in the `coffee_entries` table. |
| State management | RxJS BehaviorSubject | Migrate to Angular Signals (Angular 17+ stable) for simpler reactive primitives; or NgRx Signals Store if complexity grows. The service interface is unchanged. |
| Offline PWA | Not configured | Add `@angular/service-worker` with a `ngsw-config.json`. For offline writes, buffer mutations in IndexedDB and replay them when connectivity is restored — requires a sync strategy not needed for a connected-only app. |
| Export / Backup | None | Add a "Export JSON" button: call `GET /api/v1/coffees`, then `URL.createObjectURL(new Blob([JSON.stringify(data)]))`. |
| Vercel cold starts | Minimal (lightweight Express app) | If cold start latency becomes noticeable, pre-warm with a scheduled ping, or migrate the API to Vercel Edge Functions using the `@libsql/client/web` bundle (libSQL supports the Web fetch API). |
| Search | Client-side filtering in `CoffeeService` | Move filtering to the database layer: add a `?q=` query parameter to `GET /api/v1/coffees` and use a `WHERE name LIKE ? OR origin LIKE ?` clause in the libSQL query. |

---

*Document version: 2.0 — updated for CoffeeCup v2: Turso persistence, REST API, and Vercel deployment.*
