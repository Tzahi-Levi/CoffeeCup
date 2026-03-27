import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, debounceTime, distinctUntilChanged } from 'rxjs';
import { CoffeeEntry, CoffeeEntryPayload } from '../models/coffee.models';

const STORAGE_KEY = 'coffeecup_v1';

/**
 * Singleton service that owns all coffee-entry state and persistence.
 *
 * State is held in a `BehaviorSubject<CoffeeEntry[]>` so that any
 * component can subscribe to live updates without polling. After every
 * mutation the updated array is serialized to `localStorage` under the
 * key `coffeecup_v1`, giving the data zero-dependency persistence across
 * page refreshes.
 *
 * Components must never mutate entries directly. All writes must go
 * through the public methods of this service so that the BehaviorSubject
 * and localStorage stay in sync.
 *
 * @example
 * // Inject and subscribe to the full list
 * constructor(private coffeeService: CoffeeService) {}
 *
 * ngOnInit(): void {
 *   this.coffeeService.coffees$.subscribe(entries => {
 *     console.log('Current entries:', entries);
 *   });
 * }
 *
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class CoffeeService {
  private readonly _coffees$ = new BehaviorSubject<CoffeeEntry[]>(this.loadFromStorage());

  /**
   * Observable stream of all coffee entries in insertion order.
   *
   * Emits the current array immediately on subscription, then emits
   * again whenever any entry is added, updated, or deleted.
   *
   * Use `filteredCoffees$` if you need a search-aware view.
   */
  readonly coffees$: Observable<CoffeeEntry[]> = this._coffees$.asObservable();

  /**
   * Returns an observable of coffee entries filtered by a live search query.
   *
   * Combines the master entry list with the provided query observable using
   * `combineLatest`. The query is debounced by 200ms and deduplicated with
   * `distinctUntilChanged` before filtering, so rapid keystrokes do not
   * trigger unnecessary re-renders. Filtering is case-insensitive and checks
   * both the `name` and `origin` fields. A blank or whitespace-only query
   * returns the full unfiltered list.
   *
   * @param query$ - Observable emitting the current search string. Typically
   *   `SearchService.query$`, but any `Observable<string>` is accepted.
   * @returns An observable that emits a filtered `CoffeeEntry[]` on every
   *   meaningful change to either the entry list or the debounced query.
   *
   * @example
   * // In a component that injects both services
   * this.filtered$ = this.coffeeService.filteredCoffees$(this.searchService.query$);
   */
  filteredCoffees$(query$: Observable<string>): Observable<CoffeeEntry[]> {
    return combineLatest([this._coffees$, query$.pipe(debounceTime(200), distinctUntilChanged())]).pipe(
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

  /**
   * Creates a new coffee entry from the given payload and persists it.
   *
   * A UUID v4 (`crypto.randomUUID()`) is generated for `id`, and ISO 8601
   * timestamps are set for both `createdAt` and `updatedAt`. The new entry
   * is appended to the end of the list.
   *
   * @param payload - User-supplied field values. Must satisfy all
   *   `CoffeeEntryPayload` constraints (see `coffee.models.ts`).
   * @returns The fully constructed `CoffeeEntry` including the generated
   *   `id`, `createdAt`, and `updatedAt` fields.
   *
   * @example
   * const entry = this.coffeeService.addCoffee({
   *   name: 'Brazilian Santos',
   *   origin: 'Light Roast, Brazil',
   *   grindLevel: 6,
   *   doseGrams: 19,
   *   brewTimeSeconds: 35,
   *   notes: 'Chocolatey finish.',
   *   rating: 4,
   * });
   * console.log(entry.id); // "a1b2c3d4-..."
   */
  addCoffee(payload: CoffeeEntryPayload): CoffeeEntry {
    const now = new Date().toISOString();
    const entry: CoffeeEntry = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    const updated = [...this._coffees$.getValue(), entry];
    this._coffees$.next(updated);
    this.saveToStorage(updated);
    return entry;
  }

  /**
   * Updates an existing coffee entry in place and persists the change.
   *
   * All fields from `payload` are merged onto the existing entry.
   * `createdAt` is preserved. `updatedAt` is set to the current ISO
   * timestamp. The entry's position in the list does not change.
   *
   * @param id - The UUID of the entry to update.
   * @param payload - Replacement field values. All payload fields are
   *   required; partial updates are not supported.
   * @returns The updated `CoffeeEntry` with the new `updatedAt` timestamp.
   * @throws {Error} If no entry with the given `id` exists in the current
   *   list. Guard with `getCoffeeById` before navigating to the edit form
   *   to avoid this in practice.
   *
   * @example
   * try {
   *   const updated = this.coffeeService.updateCoffee(id, payload);
   *   console.log('Updated at:', updated.updatedAt);
   * } catch (e) {
   *   console.error(e); // 'CoffeeEntry with id "..." not found'
   * }
   */
  updateCoffee(id: string, payload: CoffeeEntryPayload): CoffeeEntry {
    const coffees = this._coffees$.getValue();
    const index = coffees.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`CoffeeEntry with id "${id}" not found`);
    }
    const updated: CoffeeEntry = {
      ...coffees[index],
      ...payload,
      updatedAt: new Date().toISOString()
    };
    const updatedList = [...coffees.slice(0, index), updated, ...coffees.slice(index + 1)];
    this._coffees$.next(updatedList);
    this.saveToStorage(updatedList);
    return updated;
  }

  /**
   * Removes a coffee entry by id and persists the change.
   *
   * If no entry with the given id exists the call is a no-op — the list
   * is unchanged and no error is thrown.
   *
   * @param id - The UUID of the entry to remove.
   *
   * @example
   * this.coffeeService.deleteCoffee('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
   */
  deleteCoffee(id: string): void {
    const updated = this._coffees$.getValue().filter((c) => c.id !== id);
    this._coffees$.next(updated);
    this.saveToStorage(updated);
  }

  /**
   * Returns a single coffee entry by id from the current in-memory list.
   *
   * This is a synchronous point-in-time read from the BehaviorSubject's
   * current value — it does not return an observable. Use it for one-off
   * lookups such as pre-populating the edit form on route activation.
   *
   * @param id - The UUID of the entry to retrieve.
   * @returns The matching `CoffeeEntry`, or `undefined` if not found.
   *
   * @example
   * const entry = this.coffeeService.getCoffeeById(routeId);
   * if (!entry) {
   *   this.router.navigate(['/']);
   *   return;
   * }
   * this.form.patchValue(entry);
   */
  getCoffeeById(id: string): CoffeeEntry | undefined {
    return this._coffees$.getValue().find((c) => c.id === id);
  }

  private loadFromStorage(): CoffeeEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CoffeeEntry[];
      // Migrate existing entries that predate the roastLevel / coffeeType / blendComponents fields.
      return parsed.map((entry) => ({
        ...entry,
        roastLevel: entry.roastLevel ?? null,
        coffeeType: entry.coffeeType ?? null,
        blendComponents: entry.blendComponents ?? [],
      }));
    } catch (err) {
      // Log parse failure so data-loss events are visible in DevTools; intentionally
      // omits raw storage value to avoid exposing user coffee data in logs.
      console.error('[CoffeeService] Failed to parse localStorage data — starting with empty list.', {
        key: STORAGE_KEY,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  private saveToStorage(coffees: CoffeeEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coffees));
    } catch (err) {
      console.error('[CoffeeService] Failed to save to localStorage — changes not persisted.', {
        key: STORAGE_KEY,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
