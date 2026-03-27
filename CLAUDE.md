# CoffeeCup — Claude Project Instructions

## Project Overview
Personal coffee recipe manager. Angular 17+ SPA served by a Node.js/Express backend. All data is stored in `localStorage` (no database).

## Repository Structure
```
CoffeeCup/
├── frontend/          # Angular 17+ app
│   ├── src/
│   │   ├── app/
│   │   │   ├── models/       # coffee.models.ts (CoffeeEntry, CoffeeEntryPayload)
│   │   │   ├── services/     # coffee.service.ts, search.service.ts
│   │   │   ├── components/   # Presentational components (OnPush)
│   │   │   ├── pages/        # Smart/page components (default CD)
│   │   │   └── app.routes.ts # Lazy-loaded routes via loadComponent
│   │   └── styles/           # _tokens.scss (design system CSS vars)
│   └── package.json
├── backend/           # Express 5 server
│   └── src/server.ts
├── ARCHITECTURE.md
├── TASKS.md
└── DEPLOYMENT.md
```

## Build & Dev Commands

```bash
# Frontend dev server
cd frontend && npx ng serve

# Frontend production build → dist/coffeecup/browser/
cd frontend && npm run build

# Backend build → dist/server.js
cd backend && npm run build

# Docker (full stack)
docker build -t coffeecup:latest . && docker run -p 3000:3000 coffeecup:latest
```

## Angular Conventions

- **Control flow**: Use `@for`/`@if` (NOT `*ngFor`/`*ngIf`)
- **All components**: `standalone: true`
- **Presentational components**: `ChangeDetectionStrategy.OnPush`
- **Smart/page components**: default CD, use `async` pipe
- **Routing**: `loadComponent` (lazy) in `app.routes.ts`
- **Animations**: `provideAnimations()` in `app.config.ts` (NOT `provideAnimationsAsync`)

## Data Model

```typescript
// frontend/src/app/models/coffee.models.ts
interface CoffeeEntry {
  id: string;              // UUID v4
  name: string;            // max 100 chars
  origin: string | null;
  grindLevel: number;      // 1–10 (will expand to 1–30)
  doseGrams: number;
  brewTimeSeconds: number;
  notes: string | null;    // max 1000 chars
  rating: number | null;   // 1–5 or null
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}
```

## Design System

All design values live in `frontend/src/styles/_tokens.scss` as CSS custom properties.

- **Background**: `#2C1810`
- **Surface**: `#3D2314`
- **Elevated**: `#4E2E1A`
- **Accent**: `#D4860B` / Hover: `#E8A020`
- **Text primary**: `#F5ECD7` / Secondary: `#C4A882` / Muted: `#8A6A4A`
- **Font**: Outfit (Google Fonts), loaded in `index.html`
- **BEM naming** in all SCSS files
- **Icons**: Unicode emoji characters (no external icon library)

## State Management

- `CoffeeService` — RxJS `BehaviorSubject`, persists to `localStorage` key `coffeecup_v1`
- `SearchService` — search query with `debounceTime(200)` + `distinctUntilChanged`
- Forms: Angular Reactive Forms with `ControlValueAccessor` on custom inputs

## Key Quality Rules Applied

- `try/catch` on `saveToStorage` for `QuotaExceededError`
- `console.warn` on silent redirects in `CoffeeFormPage`
- Structured JSON error logging in Express error handler
- `setQuery` trims input before `BehaviorSubject.next()`
