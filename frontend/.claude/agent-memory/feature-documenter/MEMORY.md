# Feature Documenter — Project Memory

## Project: CoffeeCup

### Documentation style
- Inline docs: TSDoc-style JSDoc (/** ... */ blocks with @param, @returns, @throws, @example, @since tags)
- Existing single-line service comments use `/** ... */` style — extend consistently
- docs/ files use Markdown with H2 section headers per feature
- SCREAMING_SNAKE_CASE for docs filenames (e.g. FEATURES.md)

### Key file locations
- Project root: `C:\Users\Tazac\Documents\Coding\CoffeeCup\`
- Architecture reference: `ARCHITECTURE.md` (comprehensive — read first before documenting)
- Feature docs: `docs/FEATURES.md`
- Project README: `README.md`
- Frontend services: `frontend/src/app/services/`
- Frontend models: `frontend/src/app/models/coffee.models.ts`
- Design tokens: `frontend/src/styles/_tokens.scss`

### Architectural patterns
- Single BehaviorSubject in CoffeeService owns all state; components never mutate directly
- SearchService is a thin bridge — holds only the query string BehaviorSubject
- All persistence via localStorage key `coffeecup_v1`; CoffeeService is the only actor that reads/writes it
- Angular standalone components throughout — no NgModules except bootstrap
- Animation triggers defined in co-located `*.animations.ts` files, not inline in decorators

### Watch out for
- Other agents may update service files mid-session; always re-read before writing to avoid stale edits
- `filteredCoffees$` debounces the query with `debounceTime(200)` + `distinctUntilChanged()` — document this accurately
- `saveToStorage` has a try/catch (added by another agent); `loadFromStorage` also catches and logs
- The `formFieldError` animation is described in ARCHITECTURE.md but is NOT implemented in FormFieldComponent source — flag as planned, do not document as existing

### Docs coverage completed (this session)
- `README.md` at project root
- `docs/FEATURES.md` (all 6 features)
- JSDoc on `coffee.service.ts` (class + all public members)
- JSDoc on `search.service.ts` (class + all public members)
