# Code Review Agent Memory — CoffeeCup Frontend

## Project Overview
- Angular 17+ standalone-component app, no NgModules.
- TypeScript strict mode fully enabled (strict, strictTemplates, noImplicitReturns, etc.).
- State managed via BehaviorSubject services + AsyncPipe — no manual subscribe() in components.
- localStorage persistence via CoffeeService (key: `coffeecup_v1`).
- Lazy-loaded routes (loadComponent) for LibraryPage and CoffeeFormPage.
- See details: `patterns.md`

## Recurring Issues Found
- CLI scaffold `app.component.spec.ts` was stale (referenced `app.title` and h1 that don't exist). Fixed 2026-03-26.
- `onSubmit()` in form components should always wrap synchronous service calls that can throw in try/catch.
- Presentational components in this codebase do not use OnPush — future components should default to OnPush.
- `@Input()` on required data bindings (e.g. `coffees` on CoffeeCardGridComponent) should use `required: true`.
- StarRatingComponent has a type mismatch: `rating: number` should be `number | null` to match `CoffeeEntry.rating`.
