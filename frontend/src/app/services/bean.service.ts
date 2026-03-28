import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, map, tap, catchError } from 'rxjs';
import { BeanEntry, BeanEntryPayload } from '../models/bean.models';

/** Wrapper shape returned by all non-DELETE API endpoints. */
interface ApiResponse<T> {
  data: T;
}

const API_BASE = '/api/v1/beans';

/**
 * Singleton service that owns all bean-entry state.
 *
 * State is held in a `BehaviorSubject<BeanEntry[]>` that acts as a
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
export class BeanService {
  private readonly http = inject(HttpClient);
  private readonly _beans$ = new BehaviorSubject<BeanEntry[]>([]);

  /**
   * Observable stream of all bean entries.
   *
   * Emits the current array immediately on subscription, then emits
   * again whenever the local cache is refreshed from the server.
   */
  readonly beans$: Observable<BeanEntry[]> = this._beans$.asObservable();

  constructor() {
    // Seed the local cache from the API on application startup.
    this.loadAll().subscribe();
  }

  /**
   * Creates a new bean entry via the API.
   *
   * A UUID v4 (`crypto.randomUUID()`) is generated client-side and included
   * in the POST body so the backend uses the same id. On success the local
   * cache is refreshed from the server.
   *
   * @param payload - User-supplied field values.
   * @returns Observable emitting the created `BeanEntry` from the server.
   */
  addBean(payload: BeanEntryPayload): Observable<BeanEntry> {
    const body = { ...payload, id: crypto.randomUUID() };
    return this.http.post<ApiResponse<BeanEntry>>(API_BASE, body).pipe(
      map((response) => response.data),
      tap(() => this.loadAll().subscribe())
    );
  }

  /**
   * Updates an existing bean entry via the API.
   *
   * On success the local cache is refreshed from the server.
   *
   * @param id - The UUID of the entry to update.
   * @param payload - Replacement field values.
   * @returns Observable emitting the updated `BeanEntry` from the server.
   */
  updateBean(id: string, payload: BeanEntryPayload): Observable<BeanEntry> {
    return this.http.put<ApiResponse<BeanEntry>>(`${API_BASE}/${id}`, payload).pipe(
      map((response) => response.data),
      tap(() => this.loadAll().subscribe())
    );
  }

  /**
   * Removes a bean entry by id via the API.
   *
   * On success the local cache is refreshed from the server.
   *
   * @param id - The UUID of the entry to remove.
   * @returns Observable that completes on successful deletion.
   */
  deleteBean(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/${id}`).pipe(
      tap(() => this.loadAll().subscribe())
    );
  }

  /**
   * Returns a single bean entry by id from the current in-memory cache.
   *
   * This is a synchronous point-in-time read from the BehaviorSubject's
   * current value -- it does not return an observable. Use it for one-off
   * lookups such as pre-populating the edit form on route activation.
   *
   * @param id - The UUID of the entry to retrieve.
   * @returns The matching `BeanEntry`, or `undefined` if not found.
   */
  getBeanById(id: string): BeanEntry | undefined {
    return this._beans$.getValue().find((b) => b.id === id);
  }

  /**
   * Fetches all bean entries from the API and pushes them into the
   * BehaviorSubject cache.
   *
   * @returns Observable<void> that completes once the cache has been updated.
   */
  private loadAll(): Observable<void> {
    return this.http.get<ApiResponse<BeanEntry[]>>(API_BASE).pipe(
      map((response) => response.data),
      tap((beans) => this._beans$.next(beans)),
      map(() => undefined),
      catchError((err) => {
        console.error('[BeanService] Failed to load beans from API', err);
        return EMPTY;
      })
    );
  }
}
