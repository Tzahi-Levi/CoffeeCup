# CoffeeCup -- Task Plan

> Single source of truth for all implementation tasks.
> Generated from `ARCHITECTURE.md` v1.0.

---

## Status Summary

| Phase | Total | Pending | In Progress | Completed |
|-------|-------|---------|-------------|-----------|
| 1 -- Scaffolding     | 6  | 6 | 0 | 0 |
| 2 -- Core Components | 14 | 14 | 0 | 0 |
| 3 -- Animations      | 4  | 4 | 0 | 0 |
| 4 -- Backend         | 1  | 1 | 0 | 0 |
| 5 -- Tests           | 7  | 7 | 0 | 0 |
| **Total**            | **32** | **32** | **0** | **0** |

---

## Phase 1: Project Scaffolding

**Priority:** High
**Status:** pending

All subsequent phases depend on scaffolding being complete.

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T001 | Scaffold Angular frontend project | Run `ng new coffeecup --style=scss --routing --standalone` inside `frontend/`. Enable strict mode in `tsconfig.json`. Ensure `angular.json` uses the esbuild builder. Configure `app.config.ts` with `provideRouter()` and `provideAnimationsAsync()`. Add Google Fonts (Outfit) link to `index.html`. Verify `ng serve` compiles with zero errors. | backend-engineer | None | `frontend/` directory with `angular.json`, `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`, compilable project | pending |
| T002 | Scaffold Node.js/Express backend project | Create `backend/` directory. Initialize with `npm init`. Install `express`, `helmet` as dependencies and `@types/express`, `@types/node`, `ts-node-dev`, `typescript` as devDependencies. Create `tsconfig.json` with strict mode, ES2020 target, CommonJS module. Add npm scripts: `dev`, `build`, `start` per ARCHITECTURE.md Section 14.6. Create empty `src/server.ts` placeholder that compiles. Verify `npm run build` succeeds. | backend-engineer | None | `backend/package.json`, `backend/tsconfig.json`, `backend/src/server.ts` (placeholder), successful `tsc` compilation | pending |
| T003 | Create shared TypeScript data models | Create `frontend/src/app/models/coffee.models.ts` with the `CoffeeEntry` and `CoffeeEntryPayload` interfaces exactly as specified in ARCHITECTURE.md Section 7.1. All fields, types, and JSDoc comments must match. | backend-engineer | T001 | `frontend/src/app/models/coffee.models.ts` | pending |
| T004 | Create SCSS design tokens | Create `frontend/src/styles/_tokens.scss` with all CSS custom properties from ARCHITECTURE.md Section 11 (colors, typography, spacing, borders, shadows, transitions). Create `frontend/src/styles/_reset.scss` with box-sizing border-box reset, margin/padding reset on body, html height 100%. Create `frontend/src/styles/_typography.scss` with `@import url()` for Google Fonts Outfit, base body font-family, font-size, color using tokens. Update `frontend/src/styles.scss` to `@use` all three partials. | ui-designer | T001 | `frontend/src/styles/_tokens.scss`, `frontend/src/styles/_reset.scss`, `frontend/src/styles/_typography.scss`, updated `frontend/src/styles.scss` | pending |
| T005 | Configure Angular routing | Define all routes in `frontend/src/app/app.routes.ts`: `/` maps to `LibraryPageComponent`, `/add` maps to `CoffeeFormPageComponent`, `/edit/:id` maps to `CoffeeFormPageComponent`, `**` redirects to `/`. Use lazy-loaded route definitions. Add route data `animation` token for page transitions. | backend-engineer | T001 | `frontend/src/app/app.routes.ts` with all four route entries | pending |
| T006 | Create global styles entry point | Ensure `frontend/src/styles.scss` imports tokens, reset, and typography partials in correct order. Add base `html, body` styling: background-color using `--color-bg-primary`, color using `--color-text-primary`, font-family using `--font-family-primary`, min-height 100vh. Add smooth scrolling. | ui-designer | T004 | `frontend/src/styles.scss` fully configured | pending |

---

## Phase 2: Core Frontend Components

**Priority:** High
**Status:** pending

### 2A -- Services (no UI dependency)

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T007 | Implement CoffeeService | Create `frontend/src/app/services/coffee.service.ts`. Singleton (`providedIn: 'root'`). Private `BehaviorSubject<CoffeeEntry[]>` initialized from localStorage key `coffeecup_v1`. Public `coffees$` observable. Public `filteredCoffees$(query$)` method using `combineLatest` + case-insensitive filter on name and origin. CRUD methods: `addCoffee()` (generates UUID via `crypto.randomUUID()`, sets `createdAt`/`updatedAt`), `updateCoffee()` (throws if not found, updates `updatedAt`), `deleteCoffee()`, `getCoffeeById()`. Private `loadFromStorage()` and `saveToStorage()` helpers. All per ARCHITECTURE.md Sections 4.5, 8.3. | backend-engineer | T003 | `frontend/src/app/services/coffee.service.ts` | pending |
| T008 | Implement SearchService | Create `frontend/src/app/services/search.service.ts`. Singleton (`providedIn: 'root'`). Private `BehaviorSubject<string>` defaulting to `''`. Public `query$` observable. Public `setQuery(query: string)` method. Per ARCHITECTURE.md Section 4.5. | backend-engineer | T001 | `frontend/src/app/services/search.service.ts` | pending |

### 2B -- Shell and Layout Components

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T009 | Implement AppComponent (root shell) | Create/update `frontend/src/app/app.component.ts`, `.html`, `.scss`. Standalone component. Template contains `<app-toolbar>` and `<router-outlet>`. Apply global layout: dark background via `--color-bg-primary`, min-height 100vh, flex column layout. Import `RouterOutlet` and `ToolbarComponent`. | backend-engineer | T004, T005 | `frontend/src/app/app.component.ts`, `.html`, `.scss` | pending |
| T010 | Implement ToolbarComponent (header/nav) | Create `frontend/src/app/components/toolbar/toolbar.component.ts`, `.html`, `.scss`. Standalone component, selector `app-toolbar`. Displays "CoffeeCup" wordmark/logo and a tagline. Styled with design tokens: background `--color-bg-surface`, text `--color-text-primary`, font Outfit. Fixed or sticky top bar. No business logic. | ui-designer | T004 | `frontend/src/app/components/toolbar/toolbar.component.ts`, `.html`, `.scss` | pending |

### 2C -- Presentational / Reusable Components

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T011 | Implement StarRatingComponent | Create `frontend/src/app/components/star-rating/star-rating.component.ts`, `.html`, `.scss`. Standalone component, selector `app-star-rating`. Dual-mode: `@Input() rating: number` + `@Input() readonly: boolean = true`. In read-only mode renders filled/empty stars from numeric input. In interactive mode renders clickable stars and emits `@Output() ratingChange: EventEmitter<number>`. Uses `--color-star-filled` and `--color-star-empty` tokens. 5 stars, 1-5 scale. | ui-designer | T004 | `frontend/src/app/components/star-rating/star-rating.component.ts`, `.html`, `.scss` | pending |
| T012 | Implement SearchBarComponent | Create `frontend/src/app/components/search-bar/search-bar.component.ts`, `.html`, `.scss`. Standalone component, selector `app-search-bar`. Text input with placeholder "Search coffees...". Emits `@Output() searchQuery: EventEmitter<string>` on every keystroke. Purely presentational -- no service injection. Styled with tokens: background `--color-bg-elevated`, border `--border-color`, text `--color-text-primary`, placeholder `--color-text-muted`. | ui-designer | T004 | `frontend/src/app/components/search-bar/search-bar.component.ts`, `.html`, `.scss` | pending |
| T013 | Implement FormFieldComponent | Create `frontend/src/app/components/form-field/form-field.component.ts`, `.html`, `.scss`. Standalone component, selector `app-form-field`. Wraps a label + `<ng-content>` projected input. `@Input() label: string`, `@Input() errorMessage: string`. Displays error message below the input when provided. Styled per tokens. | ui-designer | T004 | `frontend/src/app/components/form-field/form-field.component.ts`, `.html`, `.scss` | pending |
| T014 | Implement GrindSliderComponent | Create `frontend/src/app/components/grind-slider/grind-slider.component.ts`, `.html`, `.scss`. Standalone component, selector `app-grind-slider`. Wraps `<input type="range" min="1" max="10">` with custom SCSS styling and numeric tick marks (1-10). Implements `ControlValueAccessor` for Reactive Forms integration. Import `NG_VALUE_ACCESSOR`, `forwardRef`. Styled with accent tokens. | backend-engineer | T004 | `frontend/src/app/components/grind-slider/grind-slider.component.ts`, `.html`, `.scss` | pending |
| T015 | Implement FabButtonComponent | Create `frontend/src/app/components/fab-button/fab-button.component.ts`, `.html`, `.scss`. Standalone component, selector `app-fab-button`. Floating action button fixed bottom-right. Navigates to `/add` on click using `Router`. Displays a "+" icon. Styled with `--color-accent`, `--shadow-raised`, circular shape via `--border-radius-full`. | ui-designer | T004 | `frontend/src/app/components/fab-button/fab-button.component.ts`, `.html`, `.scss` | pending |

### 2D -- Feature Components (smart, data-connected)

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T016 | Implement CoffeeCardComponent | Create `frontend/src/app/components/coffee-card/coffee-card.component.ts`, `.html`, `.scss`. Standalone component, selector `app-coffee-card`. `@Input() coffee: CoffeeEntry`. Displays name, origin, grind level, dose, brew time, rating (via `<app-star-rating [readonly]="true">`), and truncated notes (max ~80 chars with ellipsis). Emits `@Output() edit` and `@Output() delete` events. Card styled with `--color-bg-surface`, `--shadow-card`, `--border-radius-lg`. Hover elevation change. | ui-designer | T003, T004, T011 | `frontend/src/app/components/coffee-card/coffee-card.component.ts`, `.html`, `.scss` | pending |
| T017 | Implement CoffeeCardGridComponent | Create `frontend/src/app/components/coffee-card-grid/coffee-card-grid.component.ts`, `.html`, `.scss`. Standalone component, selector `app-coffee-card-grid`. `@Input() coffees: CoffeeEntry[]`. Renders CSS Grid of `<app-coffee-card>` elements. When `coffees` array is empty, displays an empty-state message ("No coffees yet -- add your first brew!" with a coffee cup illustration or icon placeholder). Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop. Propagates `edit` and `delete` events from child cards. | ui-designer | T003, T004, T016 | `frontend/src/app/components/coffee-card-grid/coffee-card-grid.component.ts`, `.html`, `.scss` | pending |
| T018 | Implement LibraryPageComponent | Create `frontend/src/app/components/library-page/library-page.component.ts`, `.html`, `.scss`. Standalone component, selector `app-library-page`. Smart component: injects `CoffeeService` and `SearchService`. Subscribes to `coffeeService.filteredCoffees$(searchService.query$)` using async pipe. Template contains `<app-search-bar>` (wired to `searchService.setQuery()`), `<app-coffee-card-grid>` (bound to filtered coffees), and `<app-fab-button>`. Handles delete: shows confirm dialog, then calls `coffeeService.deleteCoffee()`. Handles edit: navigates to `/edit/:id`. Page padding using spacing tokens. | backend-engineer | T007, T008, T012, T015, T017 | `frontend/src/app/components/library-page/library-page.component.ts`, `.html`, `.scss` | pending |
| T019 | Implement CoffeeFormPageComponent (add/edit) | Create `frontend/src/app/components/coffee-form-page/coffee-form-page.component.ts`, `.html`, `.scss`. Standalone component, selector `app-coffee-form-page`. Smart component using `ReactiveFormsModule`. Reads `:id` param from `ActivatedRoute` -- if present, loads entry via `coffeeService.getCoffeeById()` and patches form (edit mode); otherwise blank form (add mode). Form fields: name (required, max 100), origin (optional, max 100), grindLevel (required, 1-10 via `<app-grind-slider>`), doseGrams (required, 1-50), brewTimeSeconds (required, 5-120), notes (optional, max 1000 via textarea), rating (optional, 1-5 via `<app-star-rating [readonly]="false">`). Uses `<app-form-field>` wrappers. Submit calls `addCoffee()` or `updateCoffee()` then navigates to `/`. Cancel navigates to `/`. Displays validation errors inline. | backend-engineer | T007, T003, T011, T013, T014 | `frontend/src/app/components/coffee-form-page/coffee-form-page.component.ts`, `.html`, `.scss` | pending |
| T020 | Implement ConfirmDialogComponent | Create a confirm dialog component or inline confirmation mechanism used by `LibraryPageComponent` when deleting. Standalone component, selector `app-confirm-dialog`. `@Input() message: string`. Emits `@Output() confirmed` and `@Output() cancelled`. Modal overlay styled with semi-transparent dark backdrop, centered card with `--color-bg-surface`, confirm/cancel buttons. Confirm button uses `--color-error`. | ui-designer | T004 | `frontend/src/app/components/confirm-dialog/confirm-dialog.component.ts`, `.html`, `.scss` | pending |

---

## Phase 3: Animations and Polish

**Priority:** Medium
**Status:** pending

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T021 | Add card enter/leave and stagger animations | Create `frontend/src/app/components/coffee-card/coffee-card.animations.ts` with `cardEnterLeave` trigger (void=>* slide up + fade in 300ms ease-out; *=>void fade out + scale down 200ms ease-in). Create `frontend/src/app/components/coffee-card-grid/coffee-card-grid.animations.ts` with `listAnimation` trigger using `query` + `stagger(50ms)`. Wire both animations into their respective component decorators. | backend-engineer | T016, T017 | `coffee-card.animations.ts`, `coffee-card-grid.animations.ts`, updated component decorators | pending |
| T022 | Add page transition animations | Create `frontend/src/app/app.animations.ts` with `pageSlide` trigger. Left/right slide (translateX +/- 20px + opacity) between library and form routes. Wire into `AppComponent` host binding on `<router-outlet>`. Add `data: { animation: 'LibraryPage' }` and `data: { animation: 'FormPage' }` to route definitions. | backend-engineer | T009, T005 | `frontend/src/app/app.animations.ts`, updated `app.component.ts`, updated `app.routes.ts` | pending |
| T023 | Add form field error animation and FAB pulse | Add `formFieldError` trigger to `FormFieldComponent`: error message slides down and fades in on invalid, reverses on valid (height 0 to auto, 200ms). Create `frontend/src/app/components/fab-button/fab-button.animations.ts` with `fabPulse` trigger (scale 0 to 1 with cubic-bezier overshoot on init). Wire into respective component decorators. | backend-engineer | T013, T015 | Updated `form-field.component.ts`, `fab-button.animations.ts`, updated `fab-button.component.ts` | pending |
| T024 | Responsive layout polish and mobile-first CSS | Review and refine all component SCSS for mobile-first responsive design. Card grid: 1 col < 600px, 2 col 600-900px, 3 col > 900px. Form page: full-width on mobile, max-width 600px centered on desktop. Toolbar: responsive font sizing. FAB: consistent positioning across viewports. Search bar: full-width on mobile. Test at 320px, 768px, 1024px, 1440px breakpoints. Add any missing media queries. | ui-designer | T009, T010, T012, T016, T017, T018, T019, T020 | Updated SCSS files across all components with responsive breakpoints | pending |

---

## Phase 4: Backend Server

**Priority:** Medium
**Status:** pending

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T025 | Implement Express server with health endpoint | Implement `backend/src/server.ts` fully. Read PORT from `process.env.PORT` (default 3000). Use `helmet()` middleware with CSP configuration from ARCHITECTURE.md Section 9 (default-src self, style-src self + unsafe-inline + fonts.googleapis.com, font-src fonts.gstatic.com). Mount `express.static()` pointing at `../frontend/dist/coffeecup/browser`. Register `GET /health` returning `{ status: "ok", timestamp: new Date().toISOString() }` with 200. Register catch-all `GET *` sending `index.html` for SPA fallback. Call `app.listen(PORT)` with startup log. Verify `npm run build && node dist/server.js` starts without error. | backend-engineer | T002 | `backend/src/server.ts` fully implemented, compiles and runs | pending |

---

## Phase 5: Tests

**Priority:** High
**Status:** pending

### 5A -- Service Unit Tests

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T026 | Unit tests for CoffeeService | Create `frontend/src/app/services/coffee.service.spec.ts`. Test all public methods: `addCoffee()` creates entry with UUID, timestamps, and persists to localStorage; `updateCoffee()` modifies entry and updates `updatedAt`; `updateCoffee()` throws for nonexistent id; `deleteCoffee()` removes entry; `getCoffeeById()` returns correct entry or undefined; `coffees$` emits current state; `filteredCoffees$()` filters by name and origin case-insensitively; localStorage is read on init and written on every mutation. Mock `localStorage` and `crypto.randomUUID()`. All tests must pass via `ng test`. | tdd-automation-agent | T007 | `frontend/src/app/services/coffee.service.spec.ts`, all tests green | pending |
| T027 | Unit tests for SearchService | Create `frontend/src/app/services/search.service.spec.ts`. Test: initial `query$` emits empty string; `setQuery('test')` causes `query$` to emit `'test'`; multiple `setQuery` calls emit latest value. All tests must pass via `ng test`. | tdd-automation-agent | T008 | `frontend/src/app/services/search.service.spec.ts`, all tests green | pending |

### 5B -- Component Tests

| ID | Title | Description | Agent | Dependencies | Expected Output | Status |
|----|-------|-------------|-------|--------------|-----------------|--------|
| T028 | Component tests for CoffeeCardComponent | Create `frontend/src/app/components/coffee-card/coffee-card.component.spec.ts`. Test: renders coffee name, origin, grind level, dose, brew time from `@Input() coffee`; renders star rating component; truncates long notes; emits `edit` event on edit button click; emits `delete` event on delete button click. Use Angular `TestBed` with `ComponentFixture`. All tests must pass. | tdd-automation-agent | T016 | `coffee-card.component.spec.ts`, all tests green | pending |
| T029 | Component tests for AddEditFormComponent (CoffeeFormPageComponent) | Create `frontend/src/app/components/coffee-form-page/coffee-form-page.component.spec.ts`. Test: form renders all fields; required field validation (name, grindLevel, doseGrams, brewTimeSeconds) shows errors when blank/invalid; optional fields (origin, notes, rating) accept empty; grindLevel constrained 1-10; doseGrams constrained 1-50; brewTimeSeconds constrained 5-120; submit button disabled when form invalid; in add mode calls `coffeeService.addCoffee()` on valid submit; in edit mode patches form with existing data and calls `coffeeService.updateCoffee()`; cancel navigates to `/`. Mock `CoffeeService`, `ActivatedRoute`, `Router`. All tests must pass. | tdd-automation-agent | T019 | `coffee-form-page.component.spec.ts`, all tests green | pending |
| T030 | Component tests for LibraryPageComponent | Create `frontend/src/app/components/library-page/library-page.component.spec.ts`. Test: renders search bar, card grid, and FAB button; displays coffee cards from service observable; search input updates SearchService query; delete triggers confirm dialog and calls `coffeeService.deleteCoffee()` on confirm; edit navigates to `/edit/:id`; shows empty state when no coffees. Mock `CoffeeService`, `SearchService`, `Router`. All tests must pass. | tdd-automation-agent | T018 | `library-page.component.spec.ts`, all tests green | pending |
| T031 | Component tests for StarRatingComponent | Create `frontend/src/app/components/star-rating/star-rating.component.spec.ts`. Test: renders correct number of filled/empty stars for given rating in read-only mode; clicking a star in interactive mode emits `ratingChange` with correct value; does not emit events in read-only mode; handles edge cases (rating 0, rating 5, null). All tests must pass. | tdd-automation-agent | T011 | `star-rating.component.spec.ts`, all tests green | pending |
| T032 | Component tests for SearchBarComponent | Create `frontend/src/app/components/search-bar/search-bar.component.spec.ts`. Test: renders input element; typing emits `searchQuery` event with input value; placeholder text is present; clears emit empty string. All tests must pass. | tdd-automation-agent | T012 | `search-bar.component.spec.ts`, all tests green | pending |

---

## Dependency Graph (visual)

```
T001 (Angular scaffold) ──┬── T003 (models) ──── T007 (CoffeeService) ──┐
                          │                                              │
                          ├── T004 (tokens) ──┬── T006 (global styles)  │
                          │                   ├── T010 (toolbar)         │
                          │                   ├── T011 (star rating)     │
                          │                   ├── T012 (search bar)      │
                          │                   ├── T013 (form field)      │
                          │                   ├── T014 (grind slider)    │
                          │                   ├── T015 (fab button)      │
                          │                   └── T020 (confirm dialog)  │
                          │                                              │
                          ├── T005 (routing) ── T009 (AppComponent) ─────┤
                          │                                              │
                          └── T008 (SearchService) ─────────────────────┤
                                                                        │
T011 + T003 + T004 ──── T016 (card) ──── T017 (grid) ──┐               │
                                                        │               │
T012 + T015 + T017 + T007 + T008 ──── T018 (library) ──┤               │
                                                        │               │
T007 + T003 + T011 + T013 + T014 ──── T019 (form) ─────┤               │
                                                        │               │
All Phase 2 components ──── T021-T024 (animations) ─────┤               │
                                                        │               │
T002 (backend scaffold) ──── T025 (Express server)      │               │
                                                        │               │
T007 ──── T026 (CoffeeService tests)                    │               │
T008 ──── T027 (SearchService tests)                    │               │
T016 ──── T028 (card tests)                             │               │
T019 ──── T029 (form tests)                             │               │
T018 ──── T030 (library tests)                          │               │
T011 ──── T031 (star rating tests)                      │               │
T012 ──── T032 (search bar tests)                       │               │
```

---

## Agent Assignment Summary

| Agent | Assigned Tasks |
|-------|---------------|
| **backend-engineer** | T001, T002, T003, T005, T007, T008, T009, T014, T018, T019, T021, T022, T023, T025 |
| **ui-designer** | T004, T006, T010, T011, T012, T013, T015, T016, T017, T020, T024 |
| **tdd-automation-agent** | T026, T027, T028, T029, T030, T031, T032 |

---

## Notes

- All code is TypeScript. Frontend uses Angular 17+ standalone components with SCSS. Backend uses Express 4.x.
- localStorage key: `coffeecup_v1`. No backend database in v1.
- Every component is standalone (no NgModules except root bootstrap).
- All animations use `@angular/animations` -- no third-party animation libraries.
- Tests use Angular TestBed with Jasmine/Karma (Angular CLI default).
- The backend server is intentionally minimal: static file serving + `/health` endpoint only.
