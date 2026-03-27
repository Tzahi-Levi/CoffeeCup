# Performance Review: CoffeeCup Angular App

**Date:** 2026-03-26
**Reviewed by:** Performance Engineer Agent
**Severity Scale:** CRITICAL | HIGH | MEDIUM | LOW

---

## Summary

The CoffeeCup application is a small-scale, client-side-only Angular app that stores coffee entries in localStorage. The overall performance posture is **good**. Routes are properly lazy-loaded, the async pipe is used correctly to avoid manual subscription management, and animations stick to GPU-compositable properties (transform, opacity). There are no critical findings. The main opportunities are around missing `OnPush` change detection, an un-debounced search input, and a `combineLatest` chain that re-filters on every keystroke without any debounce window. These are medium-priority improvements that would matter more as the data set grows.

---

## Bottlenecks & Hot Paths

| # | Area | Issue | Severity |
|---|------|-------|----------|
| 1 | Change Detection | No component uses `ChangeDetectionStrategy.OnPush` | MEDIUM |
| 2 | Search / Observable | `SearchBarComponent` emits on every keystroke with no debounce | MEDIUM |
| 3 | Search / Observable | `filteredCoffees$` combineLatest re-filters the entire array on every emission without `distinctUntilChanged` | MEDIUM |
| 4 | localStorage | `JSON.stringify` on every add/update/delete; `JSON.parse` on service init | LOW |
| 5 | Animations | `listAnimation` transition `* => *` triggers stagger on every change, not just initial render | LOW |
| 6 | Bundle Size | `@angular/animations` module included in main bundle via `AppComponent` | LOW |

---

## Optimisations

### 1. Missing OnPush Change Detection Strategy

**Problem:** All components (`LibraryPageComponent`, `CoffeeFormPageComponent`, `CoffeeCardGridComponent`, `CoffeeCardComponent`, `SearchBarComponent`, `AppComponent`) use Angular's default change detection strategy. This means Angular checks every component's template bindings on every change detection cycle (mouse moves, timers, XHR callbacks, etc.), even when their inputs have not changed.

**Files affected:**
- `src/app/components/library-page/library-page.component.ts` (line 13)
- `src/app/components/coffee-card-grid/coffee-card-grid.component.ts` (line 7)
- `src/app/components/coffee-card/coffee-card.component.ts` (line 9)
- `src/app/components/coffee-form-page/coffee-form-page.component.ts` (line 9)
- `src/app/components/search-bar/search-bar.component.ts` (line 7)
- `src/app/app.component.ts` (line 9)

**Recommendation:** Add `changeDetection: ChangeDetectionStrategy.OnPush` to every component. The codebase is already well-suited for this: `LibraryPageComponent` drives its template via `filteredCoffees$ | async` (the async pipe triggers `markForCheck` automatically), and presentation components like `CoffeeCardComponent` and `CoffeeCardGridComponent` are purely `@Input`-driven.

**Example (LibraryPageComponent):**

```typescript
// Before
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [AsyncPipe, SearchBarComponent, CoffeeCardGridComponent, FabButtonComponent, ConfirmDialogComponent],
  templateUrl: './library-page.component.html',
  styleUrl: './library-page.component.scss'
})
export class LibraryPageComponent implements OnInit { ... }

// After
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [AsyncPipe, SearchBarComponent, CoffeeCardGridComponent, FabButtonComponent, ConfirmDialogComponent],
  templateUrl: './library-page.component.html',
  styleUrl: './library-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibraryPageComponent implements OnInit { ... }
```

**Expected Impact:** Reduces the number of change detection cycles across the component tree. On a page with 50+ coffee cards, this avoids re-checking all card bindings on unrelated events. Estimated 30-60% reduction in change detection work.

---

### 2. Search Input Not Debounced

**Problem:** `SearchBarComponent.onInput()` emits on every single keystroke via `searchQuery.emit(input.value)`. This propagates through `SearchService.setQuery()` into the `BehaviorSubject`, which fires `combineLatest` in `filteredCoffees$`, which re-filters and re-renders the card grid on every character typed. For a user typing "Brazilian" (9 characters), this means 9 filter + render cycles in rapid succession.

**File:** `src/app/components/search-bar/search-bar.component.ts` (line 13-15)

**Recommendation:** Add a `debounceTime` operator in the observable chain. The most effective place is in `CoffeeService.filteredCoffees$()` so it is centralized, or alternatively debounce at the `SearchService` level.

**Example (in CoffeeService):**

```typescript
// Before
filteredCoffees$(query$: Observable<string>): Observable<CoffeeEntry[]> {
  return combineLatest([this._coffees$, query$]).pipe(
    map(([coffees, query]) => {
      const q = query.trim().toLowerCase();
      if (!q) return coffees;
      return coffees.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.origin?.toLowerCase().includes(q) ?? false)
      );
    })
  );
}

// After
import { debounceTime, distinctUntilChanged } from 'rxjs';

filteredCoffees$(query$: Observable<string>): Observable<CoffeeEntry[]> {
  const debouncedQuery$ = query$.pipe(
    debounceTime(200),
    distinctUntilChanged()
  );
  return combineLatest([this._coffees$, debouncedQuery$]).pipe(
    map(([coffees, query]) => {
      const q = query.trim().toLowerCase();
      if (!q) return coffees;
      return coffees.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.origin?.toLowerCase().includes(q) ?? false)
      );
    })
  );
}
```

**Expected Impact:** Reduces filter + render cycles during typing from N (one per keystroke) to approximately 1-2 per typing burst. With 200ms debounce, typing "Brazilian" triggers 1-2 filter operations instead of 9. Also eliminates redundant emissions when the trimmed query hasn't actually changed (via `distinctUntilChanged`).

---

### 3. combineLatest Missing `distinctUntilChanged`

**Problem:** Even outside of the debounce concern above, the `combineLatest` in `filteredCoffees$` will re-emit whenever either source emits, including when the coffees array reference changes but the search query is empty (meaning the filter returns the same logical data). There is no `distinctUntilChanged` to prevent unnecessary downstream emissions.

**File:** `src/app/services/coffee.service.ts` (line 21-31)

**Recommendation:** This is addressed by the debounce fix above for the query side. For the coffees side, since every mutation creates a new array reference, `distinctUntilChanged` with a shallow check would not help unless a custom comparator is used. At the current app scale (localStorage-backed, likely <500 entries), this is acceptable. No additional action needed beyond the debounce fix in item 2.

**Expected Impact:** Covered by item 2.

---

### 4. localStorage JSON.parse/stringify on Every Mutation

**Problem:** Every call to `addCoffee`, `updateCoffee`, or `deleteCoffee` calls `JSON.stringify` on the entire coffees array and writes it to localStorage synchronously. `JSON.parse` is called once on service initialization.

**Files:**
- `src/app/services/coffee.service.ts` (line 88-90, `saveToStorage`)
- `src/app/services/coffee.service.ts` (line 79-85, `loadFromStorage`)

**Recommendation:** This is **acceptable for the app's scale**. localStorage is designed for small data sets (typically 5-10MB limit). A coffee entry is roughly 200-400 bytes of JSON. Even with 1,000 entries, the full JSON payload would be ~400KB -- `JSON.stringify` on 400KB is sub-millisecond on modern hardware. The single `JSON.parse` on init is similarly fast.

If the app were to scale significantly (5,000+ entries), consider:
- Batching writes with a debounced save (e.g., save at most once every 500ms)
- Migrating to IndexedDB for structured storage

**Example (debounced save, only if scale warrants it):**

```typescript
// Only recommended if entry count exceeds ~2000
private saveTimer: ReturnType<typeof setTimeout> | null = null;

private saveToStorage(coffees: CoffeeEntry[]): void {
  if (this.saveTimer) clearTimeout(this.saveTimer);
  this.saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coffees));
  }, 300);
}
```

**Expected Impact:** At current scale: negligible. At 5,000+ entries: would prevent UI jank from synchronous serialization on rapid mutations.

---

### 5. List Animation Trigger on Every Change

**Problem:** The `listAnimation` uses a `* => *` transition, which means the stagger animation triggers on every change to the `@listAnimation` bound value -- not just on initial page load. When a user deletes a coffee or the search filter narrows results, the remaining/new cards will animate in with stagger, which may feel sluggish for frequent interactions.

**File:** `src/app/components/coffee-card-grid/coffee-card-grid.animations.ts` (line 3-8)

**Recommendation:** Consider scoping the stagger to only `:enter` elements (which it already does internally), but also evaluate whether the stagger delay (50ms per card) is desirable during search filtering. For a list of 20 items, the last card appears 1 second after the first, which could feel slow during rapid filtering.

**Example:**

```typescript
// Current: 50ms stagger on enter
query(':enter', [stagger(50, [animateChild()])], { optional: true }),

// Faster option: reduce stagger to 30ms or remove entirely for filter operations
query(':enter', [stagger(30, [animateChild()])], { optional: true }),
```

**Expected Impact:** Reducing stagger from 50ms to 30ms means a 20-card list completes stagger in 600ms instead of 1000ms. This is a perceived performance improvement rather than an actual computation saving.

---

### 6. Animations Module in Main Bundle

**Problem:** The `@angular/animations` package is imported by `AppComponent` (for `pageSlide`), which is part of the initial bundle. The animations module adds approximately 30-60KB (minified, pre-gzip) to the initial bundle. Since every route uses animations (page transitions + card animations), this is largely unavoidable, but worth noting against the 500KB budget defined in `angular.json`.

**File:** `angular.json` (line 39-44, budget configuration)

**Recommendation:** No action required. The budget is set at 500KB warning / 1MB error, which is reasonable. The animations module is used on every page, so lazy-loading it would not help. The current setup is correct.

**Expected Impact:** N/A -- informational only.

---

## Animations Assessment

All animations in the application use **GPU-compositable properties only**:

| Animation | Properties Used | GPU Composited? |
|-----------|----------------|-----------------|
| `pageSlide` (app.animations.ts) | `opacity`, `transform: translateX()` | Yes |
| `cardEnterLeave` (coffee-card.animations.ts) | `opacity`, `transform: translateY()`, `transform: scale()` | Yes |
| `listAnimation` (coffee-card-grid.animations.ts) | Delegates to child animations | Yes (inherits) |

No animations use `width`, `height`, `top`, `left`, `margin`, or other layout-triggering properties. This is correct and avoids layout thrashing. The 250ms and 300ms durations are short enough to avoid perceived sluggishness.

---

## Memory Leak Assessment

| Component | Subscription Method | Leak Risk |
|-----------|-------------------|-----------|
| `LibraryPageComponent` | `filteredCoffees$ \| async` in template | None -- async pipe auto-unsubscribes |
| `CoffeeFormPageComponent` | No subscriptions (uses snapshot params) | None |
| `CoffeeCardGridComponent` | No subscriptions (pure @Input) | None |
| `CoffeeCardComponent` | No subscriptions (pure @Input) | None |
| `SearchBarComponent` | No subscriptions (event emitter only) | None |
| `AppComponent` | No subscriptions (template-only binding) | None |

**Verdict:** No memory leaks detected. The codebase correctly avoids manual subscriptions. The `async` pipe in `library-page.component.html` (line 8) handles the `filteredCoffees$` observable lifecycle automatically. The `CoffeeFormPageComponent` uses `route.snapshot.paramMap` (synchronous read) rather than subscribing to `route.paramMap` (observable), which is appropriate since the form is not expected to react to param changes while mounted.

---

## Lazy Loading Assessment

Routes are properly lazy-loaded using `loadComponent`:

| Route | Lazy Loaded? | Method |
|-------|-------------|--------|
| `''` (Library) | Yes | `loadComponent: () => import('./components/library-page/...')` |
| `'add'` (Form) | Yes | `loadComponent: () => import('./components/coffee-form-page/...')` |
| `'edit/:id'` (Form) | Yes | `loadComponent: () => import('./components/coffee-form-page/...')` |

The `add` and `edit/:id` routes share the same lazy chunk since they import the same component. This is efficient -- Angular's bundler will deduplicate the import into a single chunk.

**Eagerly loaded in main bundle:**
- `AppComponent` (necessary -- root component)
- `ToolbarComponent` (necessary -- shown on all pages)
- `@angular/animations` (necessary -- used by AppComponent for route transitions)
- `CoffeeService` and `SearchService` (root-provided singletons, minimal size)

This is a clean and appropriate split.

---

## Metrics to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Initial bundle size (gzipped) | Angular CLI budget / bundlewatch | > 150KB gzipped |
| Largest Contentful Paint (LCP) | Lighthouse / Web Vitals | > 2.5s |
| Interaction to Next Paint (INP) | Web Vitals | > 200ms |
| Cumulative Layout Shift (CLS) | Web Vitals | > 0.1 |
| localStorage payload size | Custom logging | > 1MB |
| Component re-render count (dev) | Angular DevTools profiler | > 3x per user action |

---

## Configuration Recommendations

### angular.json -- Tighten Bundle Budget

The current budget allows up to 1MB for the initial bundle, which is generous for an app of this size. Consider tightening:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "250kb",
      "maximumError": "500kb"
    }
  ]
}
```

### Production Build Verification

Ensure production builds are run with the default configuration (which enables optimization). The current `angular.json` correctly sets `"defaultConfiguration": "production"` for the build target. No changes needed.

---

## Follow-up Actions

- [ ] Add `ChangeDetectionStrategy.OnPush` to all 6 components (MEDIUM priority)
- [ ] Add `debounceTime(200)` and `distinctUntilChanged()` to the search query observable in `CoffeeService.filteredCoffees$()` (MEDIUM priority)
- [ ] Consider reducing list stagger from 50ms to 30ms for snappier search filtering (LOW priority)
- [ ] Tighten initial bundle budget from 500KB/1MB to 250KB/500KB warning/error (LOW priority)
- [ ] Run `ng build --stats-json` and analyze with `webpack-bundle-analyzer` to establish a bundle size baseline (LOW priority)

---

## Verdict

### APPROVED_WITH_NOTES

The CoffeeCup application has no critical or high-severity performance issues. The architecture is sound: routes are lazy-loaded, the async pipe is used correctly for observable lifecycle management, animations use GPU-compositable properties only, and there are no memory leaks. The localStorage usage pattern is appropriate for the app's intended scale.

The two medium-severity findings (missing OnPush change detection and un-debounced search) are recommended improvements that should be addressed in a follow-up pass, but neither is blocking. They will become more impactful as the number of coffee entries grows.

No Loop Return block is needed -- there are no CRITICAL findings.
