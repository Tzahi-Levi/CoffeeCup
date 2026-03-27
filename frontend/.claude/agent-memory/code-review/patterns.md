# CoffeeCup Frontend — Codebase Patterns

## Architecture
- All state lives in services as BehaviorSubjects (CoffeeService, SearchService).
- Components only subscribe via AsyncPipe — no Subscription cleanup needed in components.
- filteredCoffees$ is a method on CoffeeService that accepts an Observable<string> query stream.
- Form pages use snapshot routing (ActivatedRoute.snapshot.paramMap) — not live param subscription.

## Key File Paths
- Models: src/app/models/coffee.models.ts (CoffeeEntry, CoffeeEntryPayload)
- State service: src/app/services/coffee.service.ts
- Search service: src/app/services/search.service.ts
- Routes: src/app/app.routes.ts
- App config: src/app/app.config.ts (provideRouter + provideAnimations)
- Animations: src/app/app.animations.ts (pageSlide), component-local *.animations.ts files

## Testing Patterns
- Services: TestBed.inject, localStorage.clear() in beforeEach/afterEach, firstValueFrom for async assertions.
- Components: NoopAnimationsModule in imports, jasmine.createSpyObj for service mocks.
- CoffeeFormPageComponent spec uses a helper createComponent(paramId) pattern to test add vs edit mode.

## Service Error Contract
- CoffeeService.updateCoffee() throws synchronously if id not found — callers must catch.
- CoffeeService.loadFromStorage() silently swallows parse errors (returns []).

## Change Detection
- No OnPush anywhere as of 2026-03-26 — all components use default CD.
- All presentational components are safe candidates for OnPush.

## TypeScript Notes
- StarRatingComponent.rating typed as `number` but CoffeeEntry.rating is `number | null` — mismatch.
- GrindSliderComponent.writeValue parameter typed as `number` but CVA contract allows null — defensive `?? 5` is correct intent but wrong type signature.
