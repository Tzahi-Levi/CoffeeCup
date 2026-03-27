import { TestBed } from '@angular/core/testing';
import { CoffeeService } from './coffee.service';
import { firstValueFrom } from 'rxjs';

describe('CoffeeService', () => {
  let service: CoffeeService;

  beforeEach(() => {
    localStorage.clear();
    spyOn(crypto, 'randomUUID').and.returnValue('test-uuid-1234' as `${string}-${string}-${string}-${string}-${string}`);
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoffeeService);
  });

  afterEach(() => localStorage.clear());

  const payload = () => ({
    name: 'Ethiopian Yirgacheffe',
    origin: 'Light Roast, Ethiopia',
    grindLevel: 7,
    doseGrams: 18,
    brewTimeSeconds: 28,
    notes: 'Floral and bright',
    rating: 5
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('coffees$ emits empty array on init when localStorage is empty', async () => {
    const coffees = await firstValueFrom(service.coffees$);
    expect(coffees).toEqual([]);
  });

  it('addCoffee creates entry with UUID, timestamps, and payload fields', async () => {
    const entry = service.addCoffee(payload());
    expect(entry.id).toBe('test-uuid-1234');
    expect(entry.name).toBe('Ethiopian Yirgacheffe');
    expect(entry.createdAt).toBeTruthy();
    expect(entry.updatedAt).toBeTruthy();
    const coffees = await firstValueFrom(service.coffees$);
    expect(coffees.length).toBe(1);
  });

  it('addCoffee persists to localStorage', () => {
    service.addCoffee(payload());
    const stored = JSON.parse(localStorage.getItem('coffeecup_v1')!);
    expect(stored.length).toBe(1);
    expect(stored[0].name).toBe('Ethiopian Yirgacheffe');
  });

  it('updateCoffee modifies entry and updates updatedAt', async () => {
    const entry = service.addCoffee(payload());
    const original = entry.updatedAt;
    await new Promise(r => setTimeout(r, 5));
    const updated = service.updateCoffee(entry.id, { ...payload(), name: 'Updated Name' });
    expect(updated.name).toBe('Updated Name');
    expect(updated.updatedAt).not.toBe(original);
  });

  it('updateCoffee throws for nonexistent id', () => {
    expect(() => service.updateCoffee('bad-id', payload())).toThrowError(/not found/i);
  });

  it('deleteCoffee removes the entry', async () => {
    const entry = service.addCoffee(payload());
    service.deleteCoffee(entry.id);
    const coffees = await firstValueFrom(service.coffees$);
    expect(coffees.length).toBe(0);
  });

  it('getCoffeeById returns correct entry', () => {
    const entry = service.addCoffee(payload());
    const found = service.getCoffeeById(entry.id);
    expect(found?.name).toBe('Ethiopian Yirgacheffe');
  });

  it('getCoffeeById returns undefined for missing id', () => {
    expect(service.getCoffeeById('none')).toBeUndefined();
  });

  it('filteredCoffees$ filters by name case-insensitively', async () => {
    service.addCoffee(payload());
    service.addCoffee({ ...payload(), name: 'Brazilian Santos', origin: null });
    const { BehaviorSubject } = await import('rxjs');
    const q$ = new BehaviorSubject<string>('ethiopian');
    const filtered = await firstValueFrom(service.filteredCoffees$(q$.asObservable()));
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toContain('Ethiopian');
  });

  it('filteredCoffees$ filters by origin case-insensitively', async () => {
    service.addCoffee(payload());
    service.addCoffee({ ...payload(), name: 'Brazilian Santos', origin: null });
    const { BehaviorSubject } = await import('rxjs');
    const q$ = new BehaviorSubject<string>('ethiopia');
    const filtered = await firstValueFrom(service.filteredCoffees$(q$.asObservable()));
    expect(filtered.length).toBe(1);
  });

  it('loads coffees from localStorage on init', () => {
    const stored = [{ ...payload(), id: 'abc', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    localStorage.setItem('coffeecup_v1', JSON.stringify(stored));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(CoffeeService);
    expect(fresh.getCoffeeById('abc')?.name).toBe('Ethiopian Yirgacheffe');
  });
});
