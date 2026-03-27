import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { CoffeeService } from './coffee.service';
import { CoffeeEntry, CoffeeEntryPayload } from '../models/coffee.models';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockPayload: CoffeeEntryPayload = {
  name: 'Ethiopian Yirgacheffe',
  origin: 'Ethiopia',
  grindLevel: 8,
  doseGrams: 18.5,
  brewTimeSeconds: 30,
  notes: 'Bright and fruity',
  rating: 5,
  roastLevel: 'light',
  coffeeType: 'single-origin',
  blendComponents: [],
};

const mockEntry: CoffeeEntry = {
  ...mockPayload,
  id: 'test-uuid-1',
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
};

const secondPayload: CoffeeEntryPayload = {
  name: 'Brazilian Santos',
  origin: null,
  grindLevel: 5,
  doseGrams: 20,
  brewTimeSeconds: 35,
  notes: null,
  rating: 3,
  roastLevel: 'medium',
  coffeeType: 'single-origin',
  blendComponents: [],
};

const secondEntry: CoffeeEntry = {
  ...secondPayload,
  id: 'test-uuid-2',
  createdAt: '2026-03-27T11:00:00.000Z',
  updatedAt: '2026-03-27T11:00:00.000Z',
};

const API_BASE = '/api/v1/coffees';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flush the initial GET /api/v1/coffees that fires in the constructor.
 * Every test MUST call this (or flushInitError) before asserting anything,
 * because the service triggers loadAll() on instantiation.
 */
function flushInitialLoad(httpMock: HttpTestingController, data: CoffeeEntry[] = []): void {
  const req = httpMock.expectOne(API_BASE);
  expect(req.request.method).toBe('GET');
  req.flush({ data });
}

/**
 * Flush the initial GET with a network error so we can test error resilience.
 */
function flushInitError(httpMock: HttpTestingController): void {
  const req = httpMock.expectOne(API_BASE);
  req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('CoffeeService', () => {
  let service: CoffeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CoffeeService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CoffeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // fail if there are any outstanding/unexpected requests
  });

  // -----------------------------------------------------------------------
  // Construction / initial load
  // -----------------------------------------------------------------------

  describe('on construction', () => {
    it('should load all coffees on init via GET /api/v1/coffees', async () => {
      flushInitialLoad(httpMock, [mockEntry]);

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees).toEqual([mockEntry]);
    });

    it('should emit an empty array before the initial load completes', () => {
      // Before flushing, the BehaviorSubject still holds its seed value.
      let emitted: CoffeeEntry[] | undefined;
      service.coffees$.subscribe((c) => (emitted = c));
      // The subscription fires synchronously with the BehaviorSubject seed.
      expect(emitted).toEqual([]);

      // Now flush so afterEach verify() passes.
      flushInitialLoad(httpMock);
    });

    it('should populate the cache with multiple entries', async () => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees.length).toBe(2);
      expect(coffees[0].id).toBe('test-uuid-1');
      expect(coffees[1].id).toBe('test-uuid-2');
    });
  });

  // -----------------------------------------------------------------------
  // addCoffee
  // -----------------------------------------------------------------------

  describe('addCoffee', () => {
    it('should POST to /api/v1/coffees with payload and a generated id', () => {
      flushInitialLoad(httpMock);

      let result: CoffeeEntry | undefined;
      service.addCoffee(mockPayload).subscribe((entry) => (result = entry));

      // Expect the POST request
      const postReq = httpMock.expectOne(API_BASE);
      expect(postReq.request.method).toBe('POST');
      expect(postReq.request.body.name).toBe(mockPayload.name);
      expect(postReq.request.body.origin).toBe(mockPayload.origin);
      expect(postReq.request.body.grindLevel).toBe(mockPayload.grindLevel);
      expect(postReq.request.body.doseGrams).toBe(mockPayload.doseGrams);
      expect(postReq.request.body.brewTimeSeconds).toBe(mockPayload.brewTimeSeconds);
      expect(postReq.request.body.notes).toBe(mockPayload.notes);
      expect(postReq.request.body.rating).toBe(mockPayload.rating);
      expect(typeof postReq.request.body.id).toBe('string');
      expect(postReq.request.body.id.length).toBeGreaterThan(0);
      postReq.flush({ data: mockEntry });

      expect(result).toEqual(mockEntry);

      // Flush the follow-up GET triggered by loadAll() inside tap()
      const reloadReq = httpMock.expectOne(API_BASE);
      expect(reloadReq.request.method).toBe('GET');
      reloadReq.flush({ data: [mockEntry] });
    });

    it('should refresh the cache after a successful add', async () => {
      flushInitialLoad(httpMock);

      service.addCoffee(mockPayload).subscribe();

      const postReq = httpMock.expectOne(API_BASE);
      postReq.flush({ data: mockEntry });

      const reloadReq = httpMock.expectOne(API_BASE);
      reloadReq.flush({ data: [mockEntry, secondEntry] });

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees.length).toBe(2);
    });

    it('should include roastLevel, coffeeType, and blendComponents in POST body', () => {
      flushInitialLoad(httpMock);

      service.addCoffee(mockPayload).subscribe();

      const postReq = httpMock.expectOne(API_BASE);
      expect(postReq.request.body.roastLevel).toBe('light');
      expect(postReq.request.body.coffeeType).toBe('single-origin');
      expect(postReq.request.body.blendComponents).toEqual([]);
      postReq.flush({ data: mockEntry });

      httpMock.expectOne(API_BASE).flush({ data: [mockEntry] });
    });
  });

  // -----------------------------------------------------------------------
  // updateCoffee
  // -----------------------------------------------------------------------

  describe('updateCoffee', () => {
    it('should PUT to /api/v1/coffees/:id with the payload', () => {
      flushInitialLoad(httpMock);

      const updatedPayload: CoffeeEntryPayload = { ...mockPayload, name: 'Updated Name' };
      const updatedEntry: CoffeeEntry = { ...mockEntry, name: 'Updated Name', updatedAt: '2026-03-27T12:00:00.000Z' };

      let result: CoffeeEntry | undefined;
      service.updateCoffee('test-uuid-1', updatedPayload).subscribe((entry) => (result = entry));

      const putReq = httpMock.expectOne(`${API_BASE}/test-uuid-1`);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body.name).toBe('Updated Name');
      expect(putReq.request.body.origin).toBe(mockPayload.origin);
      putReq.flush({ data: updatedEntry });

      expect(result).toEqual(updatedEntry);

      // Flush follow-up GET
      const reloadReq = httpMock.expectOne(API_BASE);
      expect(reloadReq.request.method).toBe('GET');
      reloadReq.flush({ data: [updatedEntry] });
    });

    it('should not include id in the PUT body', () => {
      flushInitialLoad(httpMock);

      service.updateCoffee('test-uuid-1', mockPayload).subscribe();

      const putReq = httpMock.expectOne(`${API_BASE}/test-uuid-1`);
      expect(putReq.request.body.id).toBeUndefined();
      putReq.flush({ data: mockEntry });

      httpMock.expectOne(API_BASE).flush({ data: [mockEntry] });
    });

    it('should refresh the cache after a successful update', async () => {
      flushInitialLoad(httpMock, [mockEntry]);

      const updatedEntry: CoffeeEntry = { ...mockEntry, name: 'New Name' };
      service.updateCoffee('test-uuid-1', { ...mockPayload, name: 'New Name' }).subscribe();

      httpMock.expectOne(`${API_BASE}/test-uuid-1`).flush({ data: updatedEntry });
      httpMock.expectOne(API_BASE).flush({ data: [updatedEntry] });

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees[0].name).toBe('New Name');
    });
  });

  // -----------------------------------------------------------------------
  // deleteCoffee
  // -----------------------------------------------------------------------

  describe('deleteCoffee', () => {
    it('should DELETE /api/v1/coffees/:id', () => {
      flushInitialLoad(httpMock, [mockEntry]);

      let completed = false;
      service.deleteCoffee('test-uuid-1').subscribe({ complete: () => (completed = true) });

      const deleteReq = httpMock.expectOne(`${API_BASE}/test-uuid-1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null, { status: 204, statusText: 'No Content' });

      // Flush follow-up GET
      const reloadReq = httpMock.expectOne(API_BASE);
      expect(reloadReq.request.method).toBe('GET');
      reloadReq.flush({ data: [] });
    });

    it('should refresh the cache after a successful delete', async () => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      service.deleteCoffee('test-uuid-1').subscribe();

      httpMock.expectOne(`${API_BASE}/test-uuid-1`).flush(null, { status: 204, statusText: 'No Content' });
      httpMock.expectOne(API_BASE).flush({ data: [secondEntry] });

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees.length).toBe(1);
      expect(coffees[0].id).toBe('test-uuid-2');
    });
  });

  // -----------------------------------------------------------------------
  // getCoffeeById
  // -----------------------------------------------------------------------

  describe('getCoffeeById', () => {
    it('should return the correct entry from the cache', () => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const found = service.getCoffeeById('test-uuid-1');
      expect(found).toEqual(mockEntry);
    });

    it('should return undefined for a nonexistent id', () => {
      flushInitialLoad(httpMock, [mockEntry]);

      expect(service.getCoffeeById('does-not-exist')).toBeUndefined();
    });

    it('should return undefined when the cache is empty', () => {
      flushInitialLoad(httpMock, []);

      expect(service.getCoffeeById('test-uuid-1')).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // filteredCoffees$
  // -----------------------------------------------------------------------

  describe('filteredCoffees$', () => {
    it('should filter by name case-insensitively', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('ethiopian');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200); // debounceTime(200)

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Ethiopian Yirgacheffe');
    }));

    it('should filter by origin case-insensitively', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('ethiopia');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('test-uuid-1');
    }));

    it('should return all entries for an empty query', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200);

      expect(result.length).toBe(2);
    }));

    it('should return all entries for a whitespace-only query', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('   ');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200);

      expect(result.length).toBe(2);
    }));

    it('should return empty array when no entries match', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('Kenyan');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200);

      expect(result.length).toBe(0);
    }));

    it('should debounce rapid query changes', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200); // initial empty query — all entries
      expect(result.length).toBe(2);

      // Rapid changes within 200ms window
      query$.next('e');
      query$.next('et');
      query$.next('eth');
      tick(100); // only 100ms elapsed — debounce not yet fired
      // Should still show the results from the last debounce emission
      expect(result.length).toBe(2);

      tick(100); // 200ms total — debounce fires with 'eth'
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Ethiopian Yirgacheffe');
    }));

    it('should deduplicate identical consecutive queries', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry, secondEntry]);

      const query$ = new BehaviorSubject<string>('ethiopian');
      let emissionCount = 0;
      service.filteredCoffees$(query$.asObservable()).subscribe(() => emissionCount++);

      tick(200);
      const countAfterFirst = emissionCount;

      // Emit the same value again — should be suppressed by distinctUntilChanged
      query$.next('ethiopian');
      tick(200);

      expect(emissionCount).toBe(countAfterFirst);
    }));

    it('should not match entries whose origin is null', fakeAsync(() => {
      flushInitialLoad(httpMock, [secondEntry]); // secondEntry has origin: null

      const query$ = new BehaviorSubject<string>('null');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200);

      expect(result.length).toBe(0);
    }));

    it('should react to cache updates after initial subscription', fakeAsync(() => {
      flushInitialLoad(httpMock, [mockEntry]);

      const query$ = new BehaviorSubject<string>('');
      let result: CoffeeEntry[] = [];
      service.filteredCoffees$(query$.asObservable()).subscribe((c) => (result = c));

      tick(200);
      expect(result.length).toBe(1);

      // Simulate an add that refreshes the cache
      service.addCoffee(secondPayload).subscribe();
      const postReq = httpMock.expectOne(API_BASE);
      postReq.flush({ data: secondEntry });

      const reloadReq = httpMock.expectOne(API_BASE);
      reloadReq.flush({ data: [mockEntry, secondEntry] });

      tick(200);
      expect(result.length).toBe(2);
    }));
  });

  // -----------------------------------------------------------------------
  // Error handling — documented deficiency
  // -----------------------------------------------------------------------
  //
  // BUG: The service's constructor calls `this.loadAll().subscribe()` and
  // the tap() in addCoffee/updateCoffee/deleteCoffee calls
  // `this.loadAll().subscribe()` — both without an error callback.
  //
  // When the HTTP request fails, the HttpErrorResponse becomes an
  // unhandled observable error that propagates through Zone.js and crashes
  // the Angular test runner. This prevents us from writing stable error
  // handling tests in the current suite.
  //
  // RECOMMENDED FIX: Add `catchError(() => EMPTY)` to `loadAll()` or
  // provide `{ error: () => {} }` in every `.subscribe()` call inside
  // the constructor and tap() operators.
  //
  // Until that fix is applied, the error handling tests below are skipped.
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should retain the seed empty array in coffees$ when the init GET fails', fakeAsync(() => {
      const req = httpMock.expectOne(API_BASE);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      tick(200);

      let emitted: CoffeeEntry[] = [];
      service.coffees$.subscribe((entries) => (emitted = entries));
      expect(emitted).toEqual([]);
    }));

    it('should keep existing cache when a reload after mutation fails', fakeAsync(() => {
      // Seed cache with one entry
      flushInitialLoad(httpMock, [mockEntry]);
      tick(200);

      // Trigger a delete — the DELETE succeeds but the follow-up loadAll fails
      service.deleteCoffee(mockEntry.id).subscribe();
      const deleteReq = httpMock.expectOne(`${API_BASE}/${mockEntry.id}`);
      deleteReq.flush(null, { status: 204, statusText: 'No Content' });

      const reloadReq = httpMock.expectOne(API_BASE);
      reloadReq.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      tick(200);

      // Cache should still hold the previous value (not wiped by the failed reload)
      let emitted: CoffeeEntry[] = [];
      service.coffees$.subscribe((entries) => (emitted = entries));
      expect(emitted).toEqual([mockEntry]);
    }));
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle an empty data array from the API', async () => {
      flushInitialLoad(httpMock, []);

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees).toEqual([]);
    });

    it('should handle entries with null optional fields', () => {
      const nullEntry: CoffeeEntry = {
        ...secondPayload,
        id: 'test-uuid-null',
        createdAt: '2026-03-27T10:00:00.000Z',
        updatedAt: '2026-03-27T10:00:00.000Z',
      };
      flushInitialLoad(httpMock, [nullEntry]);

      const found = service.getCoffeeById('test-uuid-null');
      expect(found).toBeDefined();
      expect(found!.origin).toBeNull();
      expect(found!.notes).toBeNull();
    });

    it('should handle multiple sequential mutations correctly', async () => {
      flushInitialLoad(httpMock, []);

      // Add first entry
      service.addCoffee(mockPayload).subscribe();
      httpMock.expectOne(API_BASE).flush({ data: mockEntry }); // POST
      httpMock.expectOne(API_BASE).flush({ data: [mockEntry] }); // reload GET

      // Add second entry
      service.addCoffee(secondPayload).subscribe();
      httpMock.expectOne(API_BASE).flush({ data: secondEntry }); // POST
      httpMock.expectOne(API_BASE).flush({ data: [mockEntry, secondEntry] }); // reload GET

      const coffees = await firstValueFrom(service.coffees$);
      expect(coffees.length).toBe(2);
    });
  });
});
