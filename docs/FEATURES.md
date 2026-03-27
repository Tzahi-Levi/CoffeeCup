# CoffeeCup — Feature Reference

This document describes every user-facing feature in CoffeeCup v1, including the components involved, validation rules, data contracts, and known limitations.

---

## Table of Contents

1. [Coffee Library](#1-coffee-library)
2. [Add Coffee](#2-add-coffee)
3. [Edit Coffee](#3-edit-coffee)
4. [Delete Coffee](#4-delete-coffee)
5. [Persistent Storage](#5-persistent-storage)
6. [Animations](#6-animations)

---

## 1. Coffee Library

**Route:** `/`
**Component:** `LibraryPageComponent` (`library-page/library-page.component.ts`)

The Library is the default view. It shows the full collection of saved coffee entries as a responsive card grid and provides live search filtering.

### How it works

On initialization, `LibraryPageComponent` calls `CoffeeService.filteredCoffees$(searchService.query$)`, which returns a `combineLatest` observable that reacts to both the stored entries and the live search query simultaneously. The template renders the result via Angular's `async` pipe, so no manual subscription management is needed.

```
User types → SearchBarComponent emits searchQuery @Output
           → LibraryPageComponent calls SearchService.setQuery(query)
           → SearchService._query$.next(query)
           → CoffeeService.filteredCoffees$() recalculates via combineLatest
           → async pipe re-renders CoffeeCardGridComponent with filtered cards
```

### Card grid

`CoffeeCardGridComponent` receives a `CoffeeEntry[]` input and renders each entry as a `CoffeeCardComponent`. Cards display:

- Coffee name (primary heading)
- Origin (secondary text, omitted if null)
- Grind level (1–10)
- Dose in grams
- Brew time in seconds
- Star rating (read-only `StarRatingComponent`, omitted if null)
- Tasting notes truncated to 80 characters (full text stored; truncation is display-only)

### Search / filter

The search bar filters entries **case-insensitively** by two fields: `name` and `origin`. Filtering happens in memory via `Array.filter` inside `CoffeeService.filteredCoffees$` — no HTTP request is made.

```typescript
coffees.filter(c =>
  c.name.toLowerCase().includes(query) ||
  (c.origin?.toLowerCase().includes(query) ?? false)
)
```

An empty or whitespace-only query returns the full unfiltered list.

### Empty state

When the `coffees` array passed to `CoffeeCardGridComponent` is empty (either because no entries exist yet, or because the current search yields no matches), the grid shows:

```
☕
No coffees yet
Add your first brew using the + button
```

This empty state is rendered by the grid component itself via an `@if` block — not by the parent page.

### Components involved

| Component | Role |
|---|---|
| `LibraryPageComponent` | Orchestrator — wires services to child inputs/outputs |
| `SearchBarComponent` | Controlled text input; emits `searchQuery: string` on every keystroke |
| `CoffeeCardGridComponent` | Renders the CSS grid or empty state; applies stagger list animation |
| `CoffeeCardComponent` | Displays a single entry; emits `edit` and `delete` outputs |
| `StarRatingComponent` | Read-only star display on each card |
| `FabButtonComponent` | Fixed bottom-right "+" button; navigates to `/add` |
| `ConfirmDialogComponent` | Shown when a delete is pending (see section 4) |

---

## 2. Add Coffee

**Route:** `/add`
**Component:** `CoffeeFormPageComponent` (`coffee-form-page/coffee-form-page.component.ts`)

A full-page reactive form for creating a new coffee entry. On valid submit, the entry is persisted to localStorage and the user is navigated back to the Library.

### Form fields

| Field | Control name | Type | Required | Default | Constraints |
|---|---|---|---|---|---|
| Coffee name | `name` | text input | Yes | `''` | Max 100 characters |
| Origin / roast | `origin` | text input | No | `''` | Max 100 characters; saved as `null` if blank |
| Grind level | `grindLevel` | `GrindSliderComponent` | Yes | `5` | Integer 1–10 inclusive |
| Dose | `doseGrams` | number input | Yes | `18` | Min 1, max 50 (grams) |
| Brew time | `brewTimeSeconds` | number input | Yes | `30` | Min 5, max 120 (seconds) |
| Notes | `notes` | textarea | No | `''` | Max 1000 characters; saved as `null` if blank |
| Rating | `rating` | `StarRatingComponent` | No | `null` | Integer 1–5 or null if not set |

### Validation rules

All validation is enforced client-side by Angular `ReactiveFormsModule` validators. The form uses `Validators.required`, `Validators.min`, `Validators.max`, and `Validators.maxLength`.

Error messages are produced by `CoffeeFormPageComponent.getError(field)` and passed to `FormFieldComponent.errorMessage`:

| Validator failure | Message shown |
|---|---|
| `required` | "This field is required" |
| `maxlength` | "Max N characters" |
| `min` | "Minimum value is N" |
| `max` | "Maximum value is N" |
| Other | "Invalid value" |

Errors are only shown after the control has been touched. Submitting an invalid form calls `form.markAllAsTouched()` to reveal all errors simultaneously.

### Submit flow

1. User clicks **Save**.
2. If `form.invalid`, all controls are marked touched and errors display — no further action.
3. If valid, the form values are normalized: string fields are trimmed; blank optional strings become `null`; numeric fields are cast with `Number()`.
4. `CoffeeService.addCoffee(payload)` is called with a `CoffeeEntryPayload`.
5. The service generates a UUID v4 (`crypto.randomUUID()`), attaches `createdAt` and `updatedAt` ISO timestamps, appends the entry to the BehaviorSubject, and writes to localStorage.
6. The router navigates to `/`.

### Grind slider

`GrindSliderComponent` wraps a native `<input type="range" min="1" max="10">` with custom SCSS styling and numeric tick marks for positions 1–10. It implements `ControlValueAccessor` so it integrates directly with `formControlName` — no extra wiring is needed in the form.

### Star rating (interactive)

`StarRatingComponent` is used in interactive mode (`[readonly]="false"`) on the form. Clicking a star calls `setRating(star)` which emits `ratingChange`. The form page listens via `(ratingChange)="onRatingChange($event)"` and patches the form control.

---

## 3. Edit Coffee

**Route:** `/edit/:id`
**Component:** `CoffeeFormPageComponent` (same component as Add)

The Edit flow reuses `CoffeeFormPageComponent`. The presence of the `:id` route parameter determines edit mode.

### How edit mode activates

On `ngOnInit`, the component reads `this.route.snapshot.paramMap.get('id')`. If an id is present:

1. `isEditMode` is set to `true`.
2. `CoffeeService.getCoffeeById(id)` is called synchronously (reads from the BehaviorSubject's current value).
3. If the entry exists, `form.patchValue()` pre-populates every field.
4. If the entry does not exist (stale link, manual URL entry), the router redirects to `/`.

The form UI is identical to Add Coffee. The page title and submit button label change based on `isEditMode`.

### Submit flow (edit)

The submit handler follows the same validation path as Add. When `isEditMode` is true, it calls `CoffeeService.updateCoffee(editId, payload)` instead of `addCoffee`. The service:

1. Finds the entry by id; throws `Error` if not found (guarded above by the redirect).
2. Creates an updated entry object, preserving the original `createdAt` and updating `updatedAt` to the current ISO timestamp.
3. Replaces the entry in the BehaviorSubject array and writes to localStorage.

Navigation returns to `/` after a successful update.

---

## 4. Delete Coffee

**Triggered from:** `LibraryPageComponent` via `CoffeeCardComponent`
**Dialog component:** `ConfirmDialogComponent` (`confirm-dialog/confirm-dialog.component.ts`)

Deletion is a two-step process to prevent accidental data loss.

### Delete flow

```
1. User clicks "Delete" on a CoffeeCardComponent
2. CoffeeCardComponent emits delete @Output
3. CoffeeCardGridComponent forwards coffee.id via its own delete @Output
4. LibraryPageComponent.onDeleteRequest(id) sets pendingDeleteId = id
5. Template renders <app-confirm-dialog> because pendingDeleteId is non-null
6a. User clicks Confirm → onDeleteConfirmed() calls CoffeeService.deleteCoffee(pendingDeleteId)
    → pendingDeleteId = null (dialog closes)
6b. User clicks Cancel → onDeleteCancelled() sets pendingDeleteId = null (dialog closes)
```

### ConfirmDialogComponent inputs/outputs

| Name | Direction | Type | Description |
|---|---|---|---|
| `message` | `@Input` | `string` | Dialog body text. Default: `'Are you sure?'` |
| `confirmed` | `@Output` | `EventEmitter<void>` | Emitted when the user clicks the confirm button |
| `cancelled` | `@Output` | `EventEmitter<void>` | Emitted when the user clicks the cancel button |

The dialog is always rendered inline (not as a modal overlay injected into the DOM root). It appears in the Library page template when `pendingDeleteId` is non-null.

---

## 5. Persistent Storage

**Service:** `CoffeeService` (`services/coffee.service.ts`)
**Storage key:** `coffeecup_v1`

All coffee data is persisted in the browser's `localStorage`. No data is sent to the server.

### Storage key

```
coffeecup_v1
```

The `_v1` suffix is a schema version. If the data model changes in a future release, a new key (`coffeecup_v2`) is introduced and a one-time migration function re-keys the data on startup.

### Data schema

The value stored at `coffeecup_v1` is a JSON-serialized array of `CoffeeEntry` objects.

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

### CoffeeEntry field reference

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID v4 generated by `crypto.randomUUID()` |
| `name` | `string` | Required. Max 100 characters. |
| `origin` | `string \| null` | Optional. Max 100 characters. |
| `grindLevel` | `number` | Integer 1–10 inclusive. |
| `doseGrams` | `number` | Positive float. Min 1, max 50. |
| `brewTimeSeconds` | `number` | Positive integer. Min 5, max 120. |
| `notes` | `string \| null` | Optional free text. Max 1000 characters. |
| `rating` | `number \| null` | Integer 1–5, or null if the entry is unrated. |
| `createdAt` | `string` | ISO 8601 timestamp set once on creation. |
| `updatedAt` | `string` | ISO 8601 timestamp updated on every edit. |

### Read / write operations

`CoffeeService` is the only actor that reads from or writes to localStorage.

```typescript
// Read (called once on service construction)
const raw = localStorage.getItem('coffeecup_v1');
const entries: CoffeeEntry[] = raw ? JSON.parse(raw) : [];

// Write (called after every addCoffee, updateCoffee, or deleteCoffee)
localStorage.setItem('coffeecup_v1', JSON.stringify(entries));
```

If `JSON.parse` throws (corrupt data), `loadFromStorage` catches the error and returns an empty array — the app starts clean rather than crashing.

### Capacity

The browser enforces a ~5–10 MB localStorage quota per origin. Each `CoffeeEntry` serializes to roughly 300–500 bytes. At 500 bytes per entry this supports approximately 10,000–20,000 entries before approaching the limit — well beyond realistic use.

---

## 6. Animations

All animations use Angular's `@angular/animations` module. No external animation libraries are used.

### Card enter/leave

**Trigger:** `cardEnterLeave`
**File:** `components/coffee-card/coffee-card.animations.ts`
**Host:** `CoffeeCardComponent` (via `@HostBinding('@cardEnterLeave')`)

| Transition | Effect | Duration |
|---|---|---|
| `:enter` (void → *) | Fades in + slides up from 12px below final position | 300ms ease-out |
| `:leave` (* → void) | Fades out + scales down to 95% | 200ms ease-in |

### Card list stagger

**Trigger:** `listAnimation`
**File:** `components/coffee-card-grid/coffee-card-grid.animations.ts`
**Host:** `CoffeeCardGridComponent` (`[@listAnimation]="coffees.length"`)

Wraps the `cardEnterLeave` child animations with `query` + `stagger`. Entering cards cascade in 50ms apart. Leaving cards cascade out 30ms apart. This prevents all cards from animating simultaneously when the library first loads or when a search is cleared.

### FAB enter

**Trigger:** `fabEnter`
**File:** `components/fab-button/fab-button.animations.ts`
**Host:** `FabButtonComponent` (via `@HostBinding('@fabEnter')`)

| Transition | Effect | Duration / Easing |
|---|---|---|
| `:enter` | Scales from 0 → 1 with a spring overshoot | 300ms `cubic-bezier(0.34, 1.56, 0.64, 1)` |

The cubic-bezier values produce a slight overshoot past 1 before settling, giving the button a bouncy "pop" on mount.

### Page slide transitions

**Trigger:** `pageSlide`
**File:** `app.animations.ts`
**Host:** `AppComponent` router-outlet (`[@pageSlide]="getRouteAnimation(outlet)"`)

Route animation states are set via `data: { animation: '...' }` in `app.routes.ts`.

| State transition | Enter direction | Leave direction | Duration |
|---|---|---|---|
| `LibraryPage => FormPage` | Slides in from right (+20px) | Slides out to left (-20px) | 250ms |
| `FormPage => LibraryPage` | Slides in from left (-20px) | Slides out to right (+20px) | 250ms |

Both transitions also cross-fade opacity (0 → 1 / 1 → 0) simultaneously with the translate. The entering and leaving views are absolutely positioned during the transition so they overlap without causing layout shifts.

### Known limitations (animations)

- The `formFieldError` animation described in `ARCHITECTURE.md` (height-based slide-in for validation errors) is listed in the architecture document but not yet present in the `FormFieldComponent` source. Error messages currently appear without animation. This is a planned enhancement.
- Angular's `BrowserAnimationsModule` (enabled via `provideAnimationsAsync()`) requires the page to be rendered in a real browser context. Server-side rendering (SSR) would require `provideServerRendering()` and animation polyfills — not configured in v1.
- `stagger` animations are triggered by changes to `[@listAnimation]="coffees.length"`. If two mutations produce the same array length (e.g., delete one entry and add a different one in rapid succession), the trigger may not fire. This edge case has no visible workaround in v1.
