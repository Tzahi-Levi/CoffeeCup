# Performance Engineer Memory -- CoffeeCup Project

## Architecture
- Angular standalone components with `loadComponent` lazy routing
- Client-side only -- no backend API, data in localStorage
- State management via BehaviorSubject in root-provided services
- SCSS styling, Angular animations for page transitions and card enter/leave

## Key Files
- Routes: `src/app/app.routes.ts`
- State: `src/app/services/coffee.service.ts` (BehaviorSubject + localStorage)
- Search: `src/app/services/search.service.ts` (BehaviorSubject)
- Models: `src/app/models/coffee.models.ts`

## Known Patterns
- Components do NOT use OnPush change detection (recommended improvement)
- Search input is not debounced -- emits on every keystroke
- async pipe used correctly in library-page template -- no leak risk
- All animations use transform/opacity only (GPU-composited, no layout thrash)
- Bundle budget: 500KB warn / 1MB error (could be tightened)

## Build
- Builder: `@angular-devkit/build-angular:application`
- Default config: production with optimization
