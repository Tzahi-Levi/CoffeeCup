import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Singleton service that manages the global search query string.
 *
 * Acts as a thin reactive bridge between `SearchBarComponent` (which
 * produces the raw user input) and `CoffeeService.filteredCoffees$`
 * (which consumes the query as an observable). Keeping the query in its
 * own service allows any component to read or update the search state
 * without creating a direct dependency between sibling components.
 *
 * @example
 * // Read the current query
 * constructor(private searchService: SearchService) {}
 *
 * ngOnInit(): void {
 *   this.searchService.query$.subscribe(q => console.log('Query:', q));
 * }
 *
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly _query$ = new BehaviorSubject<string>('');

  /**
   * Observable stream of the current search query string.
   *
   * Emits an empty string on subscription (initial state), then emits
   * the trimmed query string each time `setQuery` is called. Consumed by
   * `CoffeeService.filteredCoffees$` to drive live filtering of the
   * coffee library.
   */
  readonly query$: Observable<string> = this._query$.asObservable();

  /**
   * Updates the current search query.
   *
   * The value is trimmed before being pushed to the BehaviorSubject.
   * Passing an empty string or a whitespace-only string resets the
   * filter, causing `CoffeeService.filteredCoffees$` to return the full
   * unfiltered list.
   *
   * @param query - The raw search string typed by the user.
   *
   * @example
   * // Called by LibraryPageComponent in response to SearchBarComponent's output
   * onSearch(query: string): void {
   *   this.searchService.setQuery(query);
   * }
   */
  setQuery(query: string): void {
    this._query$.next(query.trim());
  }
}
