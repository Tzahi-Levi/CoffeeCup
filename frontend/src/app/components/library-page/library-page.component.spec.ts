import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { LibraryPageComponent } from './library-page.component';
import { CoffeeService } from '../../services/coffee.service';
import { SearchService } from '../../services/search.service';
import { CoffeeEntry } from '../../models/coffee.models';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const mockCoffees: CoffeeEntry[] = [
  {
    id: '1', name: 'Ethiopian', origin: 'Ethiopia', grindLevel: 7,
    doseGrams: 18, brewTimeSeconds: 28, notes: null, rating: 5,
    roastLevel: 'light', coffeeType: 'single-origin', blendComponents: [],
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2', name: 'Brazilian', origin: 'Brazil', grindLevel: 5,
    doseGrams: 19, brewTimeSeconds: 32, notes: 'Nutty', rating: 3,
    roastLevel: 'medium', coffeeType: 'single-origin', blendComponents: [],
    createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z'
  }
];

describe('LibraryPageComponent', () => {
  let component: LibraryPageComponent;
  let fixture: ComponentFixture<LibraryPageComponent>;
  let mockCoffeeService: jasmine.SpyObj<CoffeeService>;
  let mockSearchService: jasmine.SpyObj<SearchService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let coffeeSubject: BehaviorSubject<CoffeeEntry[]>;

  beforeEach(async () => {
    coffeeSubject = new BehaviorSubject<CoffeeEntry[]>(mockCoffees);
    mockCoffeeService = jasmine.createSpyObj(
      'CoffeeService',
      ['filteredCoffees$', 'deleteCoffee'],
      { coffees$: coffeeSubject.asObservable() }
    );
    mockCoffeeService.deleteCoffee.and.returnValue(of(undefined));
    mockSearchService = jasmine.createSpyObj('SearchService', ['setQuery'], { query$: of('') });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockCoffeeService.filteredCoffees$.and.returnValue(coffeeSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [LibraryPageComponent, NoopAnimationsModule],
      providers: [
        { provide: CoffeeService, useValue: mockCoffeeService },
        { provide: SearchService, useValue: mockSearchService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filteredCoffees$ is initialized on ngOnInit', () => {
    expect(component.filteredCoffees$).toBeTruthy();
  });

  it('calls filteredCoffees$ with search service query$', () => {
    expect(mockCoffeeService.filteredCoffees$).toHaveBeenCalledWith(mockSearchService.query$);
  });

  it('onSearch delegates to searchService.setQuery', () => {
    component.onSearch('brazil');
    expect(mockSearchService.setQuery).toHaveBeenCalledWith('brazil');
  });

  it('onEdit navigates to /edit/:id', () => {
    component.onEdit('abc-123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/edit', 'abc-123']);
  });

  it('onDeleteRequest sets pendingDeleteId', () => {
    component.onDeleteRequest('1');
    expect(component.pendingDeleteId).toBe('1');
  });

  it('onDeleteConfirmed calls deleteCoffee and clears pendingDeleteId', () => {
    component.pendingDeleteId = '1';
    component.onDeleteConfirmed();
    expect(mockCoffeeService.deleteCoffee).toHaveBeenCalledWith('1');
    expect(component.pendingDeleteId).toBeNull();
  });

  it('onDeleteCancelled clears pendingDeleteId without deleting', () => {
    component.pendingDeleteId = '1';
    component.onDeleteCancelled();
    expect(component.pendingDeleteId).toBeNull();
    expect(mockCoffeeService.deleteCoffee).not.toHaveBeenCalled();
  });

  it('pendingDeleteId is null initially', () => {
    expect(component.pendingDeleteId).toBeNull();
  });
});
