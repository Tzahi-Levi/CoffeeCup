# Software Architect Memory — CoffeeCup

## Project Identity
- App: CoffeeCup — personal espresso recipe manager, single-user, no backend DB
- Architecture doc: `C:\Users\Tazac\Documents\Coding\CoffeeCup\ARCHITECTURE.md` (v1.0)

## Stack Decisions
- Frontend: Angular 17+ standalone components, SCSS, Angular Animations, RxJS BehaviorSubject
- Backend: Node.js 20 LTS + Express 4 (static serve only) + Helmet 7 for security headers
- Storage: localStorage key `coffeecup_v1` — no database in v1
- Fonts: Outfit (primary), Inter (fallback)
- Build: Angular CLI 17+ with esbuild builder (default in Angular 17)

## Key Architecture Choices
- No NgModules — standalone components throughout; bootstrap via `main.ts` + `app.config.ts`
- Single `CoffeeService` owns `BehaviorSubject<CoffeeEntry[]>` — sole source of truth
- `SearchService` owns `BehaviorSubject<string>` query — combined via `combineLatest` in `CoffeeService.filteredCoffees$()`
- `GrindSliderComponent` implements `ControlValueAccessor` to integrate with Reactive Forms
- UUID generation: `crypto.randomUUID()` (no library needed)
- Animations defined in separate `*.animations.ts` files co-located with components

## Data Model
- `CoffeeEntry`: id (UUID), name, origin, grindLevel (1-10), doseGrams, brewTimeSeconds, notes, rating (1-5 | null), createdAt, updatedAt
- `CoffeeEntryPayload`: same minus id/createdAt/updatedAt

## Design Tokens
- All CSS custom properties in `frontend/src/styles/_tokens.scss`
- Primary bg: #2C1810 | Surface: #3D2314 | Text: #F5ECD7 | Accent: #D4860B

## File Layout
- `frontend/` — Angular app
- `backend/src/server.ts` — Express entry point
- `frontend/src/app/models/coffee.models.ts` — shared interfaces
- `frontend/src/app/services/` — CoffeeService, SearchService
- `frontend/src/styles/` — _tokens.scss, _reset.scss, _typography.scss

## Future Migration Notes
- Swap CoffeeService localStorage layer for HTTP calls to add backend persistence — BehaviorSubject stays
- LocalStorage version key strategy: increment suffix (coffeecup_v2) + one-time migration on startup
