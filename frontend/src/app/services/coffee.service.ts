import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, combineLatest, map, tap, catchError, debounceTime, distinctUntilChanged } from 'rxjs';
import { CoffeeEntry, CoffeeEntryPayload } from '../models/coffee.models';

/** Wrapper shape returned by all non-DELETE API endpoints. */
interface ApiResponse<T> {
  data: T;
}

const API_BASE = '/api/v1/coffees';

/**
 * Singleton service that owns all coffee-entry state.
 *
 * State is held in a `BehaviorSubject<CoffeeEntry[]>` that acts as a
 * local cache. The source of truth is the backend API. After every
 * mutation the cache is refreshed by calling `loadAll()`.
 *
 * Components must never mutate entries directly. All writes must go
 * through the public methods of this service so that the cache stays
 * in sync with the server.
 */
@Injectable({
  providedIn: 'root'
})
export class CoffeeService {
  private readonly http = inject(HttpClient);
  private readonly _coffees$ = new BehaviorSubject<CoffeeEntry[]>([]);
  private _loaded = false;

  /** True once the initial API fetch has completed at least once. */
  get isLoaded(): boolean { return this._loaded; }

  /**
   * Observable stream of all coffee entries.
   *
   * Emits the current array immediately on subscription, then emits
   * again whenever the local cache is refreshed from the server.
   *
   * Use `filteredCoffees$` if you need a search-aware view.
   */
  readonly coffees$: Observable<CoffeeEntry[]> = this._coffees$.asObservable();

  constructor() {
    // Seed the local cache from the API on application startup.
    this.loadAll().subscribe();
  }

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
   * Creates a new coffee entry via the API.
   *
   * A UUID v4 (`crypto.randomUUID()`) is generated client-side and included
   * in the POST body so the backend uses the same id. On success the local
   * cache is refreshed from the server.
   *
   * @param payload - User-supplied field values.
   * @returns Observable emitting the created `CoffeeEntry` from the server.
   */
  addCoffee(payload: CoffeeEntryPayload): Observable<CoffeeEntry> {
    const body = { ...payload, id: crypto.randomUUID() };
    return this.http.post<ApiResponse<CoffeeEntry>>(API_BASE, body).pipe(
      map((response) => response.data),
      tap(() => this.loadAll().subscribe())
    );
  }

  /**
   * Updates an existing coffee entry via the API.
   *
   * On success the local cache is refreshed from the server.
   *
   * @param id - The UUID of the entry to update.
   * @param payload - Replacement field values.
   * @returns Observable emitting the updated `CoffeeEntry` from the server.
   */
  updateCoffee(id: string, payload: CoffeeEntryPayload): Observable<CoffeeEntry> {
    return this.http.put<ApiResponse<CoffeeEntry>>(`${API_BASE}/${id}`, payload).pipe(
      map((response) => response.data),
      tap(() => this.loadAll().subscribe())
    );
  }

  /**
   * Removes a coffee entry by id via the API.
   *
   * On success the local cache is refreshed from the server.
   *
   * @param id - The UUID of the entry to remove.
   * @returns Observable that completes on successful deletion.
   */
  deleteCoffee(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/${id}`).pipe(
      tap(() => this.loadAll().subscribe())
    );
  }

  /**
   * Returns a single coffee entry by id from the current in-memory cache.
   *
   * This is a synchronous point-in-time read from the BehaviorSubject's
   * current value -- it does not return an observable. Use it for one-off
   * lookups such as pre-populating the edit form on route activation.
   *
   * @param id - The UUID of the entry to retrieve.
   * @returns The matching `CoffeeEntry`, or `undefined` if not found.
   */
  getCoffeeById(id: string): CoffeeEntry | undefined {
    return this._coffees$.getValue().find((c) => c.id === id);
  }

  /**
   * Triggers a fresh fetch of all coffee entries from the API.
   * Use this after external mutations (e.g. brew log changes) that affect
   * derived fields like the avg rating computed via JOIN.
   */
  refresh(): Observable<void> {
    return this.loadAll();
  }

  /**
   * Fetches all coffee entries from the API and pushes them into the
   * BehaviorSubject cache.
   *
   * @returns Observable<void> that completes once the cache has been updated.
   */
  private loadAll(): Observable<void> {
    return this.http.get<ApiResponse<CoffeeEntry[]>>(API_BASE).pipe(
      map((response) => response.data),
      tap((coffees) => { this._coffees$.next(coffees); this._loaded = true; }),
      map(() => undefined),
      catchError((err) => {
        console.error('[CoffeeService] Failed to load coffees from API', err);
        return EMPTY;
      })
    );
  }
}
