# Architecture Document: CoffeeCup

## 1. Overview

CoffeeCup is a personal coffee recipe manager — a single-page web application that allows coffee enthusiasts to create, manage, and search espresso machine profiles for each coffee bean they use. It stores all data client-side via localStorage, meaning no backend database or user accounts are required.

The system is a client-heavy SPA with a thin Node.js/Express server whose sole responsibilities are: (1) serving the compiled Angular build as static files, and (2) exposing a `/health` endpoint for future extensibility. All application logic, state, and persistence live entirely in the Angular frontend.

### Design Philosophy

- **Offline-first by default.** Using localStorage means the app works with zero network dependency after the initial page load.
- **Thin backend, fat client.** Express is a deployment convenience and a future integration point — not an application layer. Keep it inert for v1.
- **Component-driven UI.** Angular standalone components with a clear hierarchy; no NgModules except the root AppModule bootstrapper.
- **Reactive state via RxJS BehaviorSubject.** A single `CoffeeService` owns all state and exposes observables. Components never mutate state directly.
- **Design-token-based theming.** All colors, spacing, and typography are expressed as CSS custom properties defined once in a global `_tokens.scss` partial, consumed everywhere.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Angular SPA                         │   │
│  │                                                      │   │
│  │  ┌────────────┐   ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  AppShell  │   │CoffeeLibrary│  │CoffeeForm   │  │   │
│  │  │ (layout,   │──▶│ (card grid, │  │(add / edit  │  │   │
│  │  │  nav)      │   │  search bar)│  │ modal/page) │  │   │
│  │  └────────────┘   └──────┬──────┘  └──────┬──────┘  │   │
│  │                          │                │          │   │
│  │              ┌───────────▼────────────────▼──────┐   │   │
│  │              │          CoffeeService             │   │   │
│  │              │  (BehaviorSubject<CoffeeEntry[]>)  │   │   │
│  │              │  CRUD  +  Search  +  localStorage  │   │   │
│  │              └───────────────────────────────────┘   │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │         localStorage (key: "coffeecup_v1")   │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │  HTTP (static assets on initial load)
          ▼
┌─────────────────────────┐
│   Node.js / Express     │
│                         │
│  GET  /health           │
│  GET  *  → dist/index   │
└─────────────────────────┘
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
| Client storage | Browser `localStorage` | Web API | Zero-infrastructure persistence. Appropriate for a personal, single-user app. Data is serialized as JSON. |
| Build toolchain | Angular CLI + Vite (esbuild) | 17+ | Angular 17 ships with esbuild by default via the `@angular-devkit/build-angular` builder, giving fast dev-server HMR and optimized production bundles. |
| Backend runtime | Node.js | 20 LTS | Stable, widely deployed LTS release. |
| Backend framework | Express | 4.x | Minimal footprint for static file serving + one health endpoint. No need for a heavier framework. |
| Package manager | npm | 10+ | Default; consistent with Angular CLI scaffolding. |
| Fonts | Google Fonts — Outfit | — | Geometric sans-serif with a warm, modern personality that matches the specialty-coffee aesthetic. Falls back to Inter, then system-ui. |

---

## 4. Frontend Architecture

### 4.1 Angular Configuration

- **Standalone components** throughout — no `NgModule` declarations except the root bootstrap in `main.ts`.
- **Strict mode** enabled in `tsconfig.json` (`"strict": true`).
- **Angular Router** configured with `provideRouter()` in `app.config.ts`.
- **Angular Animations** enabled globally via `provideAnimationsAsync()` in `app.config.ts`.
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
| `CoffeeFormPageComponent` | `app-coffee-form-page` | Smart component. Reads `:id` from route params. If id present, loads entry from `CoffeeService` and patches form. On submit calls `addCoffee()` or `updateCoffee()`. On cancel navigates back to `/`. Uses Angular `ReactiveFormsModule`. |
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
- Reads initial state from localStorage on construction (`loadFromStorage()` private method).
- After every mutation, serializes the updated array back to localStorage (`saveToStorage()` private method).
- Generates UUIDs for new entries using `crypto.randomUUID()`.

Public API:

```typescript
// Returns all coffee entries as an observable
coffees$: Observable<CoffeeEntry[]>

// Returns filtered entries based on a live search query observable
filteredCoffees$(query$: Observable<string>): Observable<CoffeeEntry[]>

// Adds a new entry; returns the created entry
addCoffee(payload: CoffeeEntryPayload): CoffeeEntry

// Updates an existing entry by id; throws if not found
updateCoffee(id: string, payload: CoffeeEntryPayload): CoffeeEntry

// Removes an entry by id
deleteCoffee(id: string): void

// Retrieves a single entry by id; returns undefined if not found
getCoffeeById(id: string): CoffeeEntry | undefined
```

#### `SearchService`

File: `src/app/services/search.service.ts`

Singleton, provided in root.

Responsibilities:
- Owns a `BehaviorSubject<string>` for the current search query (default: empty string).
- Exposes `query$: Observable<string>`.
- Exposes `setQuery(query: string): void` — called by `SearchBarComponent` on input events.
- `LibraryPageComponent` injects both `CoffeeService` and `SearchService`, combines them via `CoffeeService.filteredCoffees$(searchService.query$)`.

### 4.6 State Flow

```
User types in SearchBarComponent
  → SearchBarComponent emits @Output searchQuery
    → LibraryPageComponent calls SearchService.setQuery(query)
      → SearchService._query$.next(query)
        → CoffeeService.filteredCoffees$(query$) recalculates
          → LibraryPageComponent template async-pipes the result
            → CoffeeCardGridComponent re-renders with filtered cards
```

---

## 5. Backend Architecture

The Express server is intentionally minimal. It has two responsibilities: serve the Angular production build as static files, and expose a `/health` endpoint.

No database. No sessions. No auth middleware. The server is stateless.

### 5.1 Express Application Structure

File: `backend/src/server.ts` (compiled to `backend/dist/server.js`)

```
Startup sequence:
  1. Read PORT from process.env (default: 3000)
  2. Mount express.static() pointing at ../frontend/dist/coffeecup/browser
  3. Register GET /health route
  4. Register catch-all GET * route → send index.html (SPA fallback)
  5. app.listen(PORT)
```

### 5.2 Express Routes

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/health` | inline | Returns `{ status: "ok", timestamp: ISO8601 }` with HTTP 200. Used for container health checks and future uptime monitoring. |
| `GET` | `*` | `express.static` fallback | Serves `index.html` from the Angular build output to support client-side routing. Any path not matched by a static file falls through to this handler. |

### 5.3 Health Endpoint Response

```typescript
// GET /health — 200 OK
interface HealthResponse {
  status: "ok";
  timestamp: string; // ISO 8601 e.g. "2026-03-26T10:00:00.000Z"
}
```

---

## 6. API Design

There is no REST API for data in v1 — all CRUD happens client-side via localStorage. The only HTTP endpoint is the health check documented in Section 5.2.

This section is reserved for v2 when/if a backend persistence layer is introduced.

### Future API Stub (v2 Reference)

These routes do NOT exist in v1 but define the shape a future Express/database backend would follow, allowing frontend services to be migrated with minimal interface change.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/coffees` | List all entries |
| `POST` | `/api/v1/coffees` | Create a new entry |
| `GET` | `/api/v1/coffees/:id` | Get a single entry |
| `PUT` | `/api/v1/coffees/:id` | Replace an entry |
| `DELETE` | `/api/v1/coffees/:id` | Remove an entry |

---

## 7. Data Models

### 7.1 TypeScript Interfaces

File: `frontend/src/app/models/coffee.models.ts`

```typescript
/**
 * A fully persisted coffee entry, including system-generated fields.
 */
export interface CoffeeEntry {
  id: string;            // UUID v4, generated by crypto.randomUUID()
  name: string;          // e.g. "Brazilian Santos" — required, max 100 chars
  origin: string | null; // e.g. "Light Roast, Brazil" — optional
  grindLevel: number;    // integer 1–10 inclusive
  doseGrams: number;     // positive float, e.g. 19.0
  brewTimeSeconds: number; // positive integer, e.g. 35
  notes: string | null;  // free text tasting notes — optional, max 1000 chars
  rating: number | null; // integer 1–5 or null if unrated
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
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

## 8. localStorage Schema

### 8.1 Key

```
coffeecup_v1
```

A single localStorage entry holds the entire dataset as a serialized JSON array.

### 8.2 Value Shape

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Brazilian Santos",
    "origin": "Light Roast, Brazil",
    "grindLevel": 6,
    "doseGrams": 19.0,
    "brewTimeSeconds": 35,
    "notes": "Sweet, low acidity. Chocolatey finish.",
    "rating": 4,
    "createdAt": "2026-03-01T08:00:00.000Z",
    "updatedAt": "2026-03-15T09:30:00.000Z"
  }
]
```

### 8.3 Storage Operations in CoffeeService

```
Read  → JSON.parse(localStorage.getItem('coffeecup_v1') ?? '[]')
Write → localStorage.setItem('coffeecup_v1', JSON.stringify(coffeeArray))
```

### 8.4 Version Migration Strategy

The key includes a version suffix (`_v1`). If the data model changes in a future version, a new key (`coffeecup_v2`) is used and a one-time migration function runs on startup to transform and re-key the data. The old key is then removed.

---

## 9. Authentication & Authorization

CoffeeCup v1 is a single-user personal tool with no user accounts, no login, and no server-side data. Authentication and authorization are out of scope.

**Security measures that remain relevant:**

- All user-supplied text is treated as untrusted input and rendered via Angular's template interpolation (`{{ }}`) which escapes HTML by default, preventing XSS.
- `innerHTML` binding is not used anywhere. If rich text rendering is ever needed, Angular's `DomSanitizer` must be used explicitly.
- localStorage data is not transmitted to any server, eliminating injection attack surface on the backend.
- The Express server sets the following HTTP security headers via the `helmet` middleware (v7):
  - `Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`

---

## 10. Security Notes

| Concern | Mitigation |
|---|---|
| XSS | Angular template interpolation escapes all user-supplied content by default. No `innerHTML` bindings. |
| CSRF | Not applicable — no server-side session or cookie-based auth in v1. |
| Content injection | Helmet.js sets a strict CSP on all responses from Express. |
| Sensitive data exposure | No PII is collected. localStorage data is not transmitted. |
| Dependency vulnerabilities | `npm audit` should be run before deployment; address any high/critical findings. |
| HTTPS | In production, deploy behind a TLS-terminating reverse proxy (nginx, Caddy, or a cloud load balancer). Express itself does not handle TLS in this architecture. |
| localStorage limits | The browser enforces a ~5–10 MB quota. At ~1 KB per entry, this supports several thousand coffee profiles before hitting limits — well beyond realistic use. |

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
│
├── frontend/                                   # Angular 17 application
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   └── src/
│       ├── index.html
│       ├── main.ts                             # Bootstrap with provideRouter, provideAnimationsAsync
│       ├── styles.scss                         # Global resets, @import tokens/fonts
│       └── app/
│           ├── app.component.ts                # Root shell, router-outlet
│           ├── app.component.html
│           ├── app.component.scss
│           ├── app.animations.ts               # Page-level route animations
│           ├── app.config.ts                   # provideRouter, provideAnimationsAsync
│           ├── app.routes.ts                   # Route definitions
│           │
│           ├── models/
│           │   └── coffee.models.ts            # CoffeeEntry, CoffeeEntryPayload interfaces
│           │
│           ├── services/
│           │   ├── coffee.service.ts           # BehaviorSubject, CRUD, localStorage
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
└── backend/                                    # Node.js / Express server
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── server.ts                           # Express app: health + static serve
```

### 13.1 Global Styles Structure

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

### 14.2 Frontend — Development

```bash
cd frontend
npm install
ng serve
# App available at http://localhost:4200
# Hot module reload enabled by default (esbuild builder)
```

### 14.3 Frontend — Production Build

```bash
cd frontend
npm run build
# Output: frontend/dist/coffeecup/browser/
```

### 14.4 Backend — Development

```bash
cd backend
npm install
npm run dev
# Uses ts-node-dev or nodemon + ts-node for live reload
# Server on http://localhost:3000
# Angular dist must be built first for static serving to work
```

### 14.5 Backend — Production

```bash
cd backend
npm run build         # tsc → dist/server.js
node dist/server.js
```

### 14.6 Backend — Required npm Scripts (package.json)

```json
{
  "scripts": {
    "dev":   "ts-node-dev --respawn src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### 14.7 Backend — Required Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.0",
    "helmet":  "^7.1.0"
  },
  "devDependencies": {
    "@types/express":   "^4.17.21",
    "@types/node":      "^20.0.0",
    "ts-node-dev":      "^2.0.0",
    "typescript":       "^5.4.0"
  }
}
```

### 14.8 Frontend — Required Dependencies

```json
{
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/common":     "^17.0.0",
    "@angular/compiler":   "^17.0.0",
    "@angular/core":       "^17.0.0",
    "@angular/forms":      "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/router":     "^17.0.0",
    "rxjs":                "^7.8.0",
    "zone.js":             "^0.14.0"
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

| Concern | v1 Approach | v2 Migration Path |
|---|---|---|
| Persistence | localStorage | Swap `CoffeeService` storage layer for HTTP calls to `/api/v1/coffees`. The `BehaviorSubject` state model remains unchanged; only the read/write operations change. |
| Multi-user | None (single user, no auth) | Add OAuth2/OIDC via a provider such as Clerk or Auth0. Express gains session middleware and JWT verification. Each user's entries are scoped by `userId`. |
| Backend database | None | Add PostgreSQL 16 via `pg` or Prisma. The `coffees` table mirrors the `CoffeeEntry` interface. |
| Image support | None | Allow a photo of the coffee bag. Store as a Base64 data URL in localStorage (small images only) or upload to S3-compatible object storage in v2. |
| State management | RxJS BehaviorSubject | Migrate to Angular Signals (Angular 17+ stable) for simpler reactive primitives; or NgRx Signals Store if complexity grows. The service interface remains the same. |
| Offline PWA | Not configured | Add `@angular/service-worker` with a `ngsw-config.json` to enable full offline caching of the app shell. localStorage already satisfies offline data needs. |
| Export / Backup | None | Add a "Export JSON" button that triggers `URL.createObjectURL(new Blob([JSON.stringify(coffees)]))` — no backend required. |

---

*Document version: 1.0 — generated for CoffeeCup v1 initial implementation.*
