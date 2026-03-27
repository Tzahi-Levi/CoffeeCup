# CoffeeCup

A personal espresso recipe manager. Track every coffee bean you use — grind level, dose, brew time, tasting notes, and star rating — all stored locally in your browser with no account or server required.

---

## Screenshots

<!-- TODO: Add screenshots once the UI is finalized -->

| Library view | Add / Edit form |
|---|---|
| _(screenshot placeholder)_ | _(screenshot placeholder)_ |

---

## Features

- **Coffee Library** — responsive card grid displaying all saved entries; live search filters by name and origin as you type; empty-state prompt when no entries exist.
- **Add Coffee** — full-page form with fields for name, origin, grind level (1–10 slider), dose (grams), brew time (seconds), tasting notes, and a 1–5 star rating.
- **Edit Coffee** — same form component pre-populated with the selected entry's data; navigated to via `/edit/:id`.
- **Delete Coffee** — confirmation dialog prevents accidental deletion; the entry is removed only after the user confirms.
- **Persistent Storage** — all data is written to `localStorage` under the key `coffeecup_v1` on every mutation; the full library survives page refresh with no network dependency.
- **Animated UI** — cards fade and slide in/out, the FAB scales in with a spring overshoot, and page transitions slide left/right between the library and form.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Angular 17+ (standalone components) |
| Language | TypeScript 5.x |
| Styling | SCSS + CSS custom properties (design tokens) |
| Animations | `@angular/animations` |
| State management | RxJS `BehaviorSubject` |
| Client persistence | Browser `localStorage` |
| Backend runtime | Node.js 18+ |
| Backend framework | Express 5 + Helmet |
| Fonts | Google Fonts — Outfit |

---

## Prerequisites

- **Node.js 18+** (Node 20 LTS recommended)
- **Angular CLI 17+**

```bash
npm install -g @angular/cli@17
```

---

## Getting Started

```bash
# Install and run the frontend (http://localhost:4200)
cd frontend && npm install && ng serve

# Install and run the backend (http://localhost:3000)
cd backend && npm install && npm run dev
```

> The backend serves the compiled Angular build as static files. Run `ng build` in `frontend/` first if you want to test static serving via Express. For active development, use `ng serve` directly.

---

## Build for Production

```bash
# Build the Angular app
cd frontend && ng build
# Output: frontend/dist/coffeecup/browser/

# Compile and start the Express server
cd backend && npm run build && npm start
# Server listens on http://localhost:3000 (override with PORT env var)
```

---

## Project Structure

```
CoffeeCup/
├── ARCHITECTURE.md                     # Full architecture reference
├── README.md
│
├── frontend/                           # Angular 17 application
│   ├── package.json
│   ├── angular.json
│   ├── tsconfig.json
│   └── src/
│       ├── styles.scss                 # Global entry: imports tokens, resets
│       ├── styles/
│       │   ├── _tokens.scss            # CSS custom properties (design tokens)
│       │   ├── _reset.scss             # Box-sizing and margin resets
│       │   └── _typography.scss        # Base font and heading defaults
│       └── app/
│           ├── app.component.ts        # Root shell, router-outlet
│           ├── app.animations.ts       # Page-level route slide animation
│           ├── app.config.ts           # provideRouter, provideAnimationsAsync
│           ├── app.routes.ts           # Route definitions
│           ├── models/
│           │   └── coffee.models.ts    # CoffeeEntry, CoffeeEntryPayload
│           ├── services/
│           │   ├── coffee.service.ts   # CRUD + localStorage + BehaviorSubject
│           │   └── search.service.ts   # Search query BehaviorSubject
│           └── components/
│               ├── toolbar/
│               ├── library-page/
│               ├── search-bar/
│               ├── coffee-card-grid/
│               ├── coffee-card/
│               ├── coffee-form-page/
│               ├── form-field/
│               ├── grind-slider/
│               ├── star-rating/
│               ├── confirm-dialog/
│               └── fab-button/
│
└── backend/                            # Node.js / Express server
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── server.ts                   # Static file serving + /health endpoint
```

---

## Design System

CoffeeCup uses a **dark warm palette** inspired by espresso and roasted coffee. All visual values are defined once as CSS custom properties in `frontend/src/styles/_tokens.scss` and consumed via `var()` throughout every component stylesheet — no hardcoded hex values in component SCSS.

| Token category | Example values |
|---|---|
| Backgrounds | `--color-bg-primary: #2C1810` (deep espresso), `--color-bg-surface: #3D2314` (card), `--color-bg-elevated: #4E2E1A` (hover/modal) |
| Text | `--color-text-primary: #F5ECD7` (cream), `--color-text-secondary: #C4A882` (warm tan), `--color-text-muted: #8A6A4A` |
| Accent | `--color-accent: #D4860B` (amber CTA), `--color-accent-hover: #E8A020` |
| Typography | `--font-family-primary: 'Outfit', 'Inter', system-ui` |
| Spacing | 4 px base unit — `--space-1` (4px) through `--space-16` (64px) |
| Border radius | `--border-radius-sm` (4px) through `--border-radius-full` (9999px) |

See `ARCHITECTURE.md` Section 11 for the full token reference.

---

## Health Check

The Express server exposes a `/health` endpoint used for container and uptime monitoring.

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-03-26T10:00:00.000Z"}
```

---

## Further Reading

- `ARCHITECTURE.md` — detailed architecture, component hierarchy, data flow, security notes, and future roadmap.
- `docs/FEATURES.md` — per-feature documentation including API reference and known limitations.
