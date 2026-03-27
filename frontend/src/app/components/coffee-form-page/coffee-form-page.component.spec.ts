import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError, NEVER } from 'rxjs';
import { CoffeeFormPageComponent } from './coffee-form-page.component';
import { CoffeeService } from '../../services/coffee.service';
import { CoffeeEntry } from '../../models/coffee.models';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const mockEntry: CoffeeEntry = {
  id: 'abc-123',
  name: 'Test Coffee',
  origin: 'Brazil',
  grindLevel: 6,
  doseGrams: 19,
  brewTimeSeconds: 32,
  notes: 'Nutty',
  rating: 4,
  roastLevel: 'medium',
  coffeeType: 'single-origin',
  blendComponents: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

describe('CoffeeFormPageComponent', () => {
  let component: CoffeeFormPageComponent;
  let fixture: ComponentFixture<CoffeeFormPageComponent>;
  let mockCoffeeService: jasmine.SpyObj<CoffeeService>;
  let mockRouter: jasmine.SpyObj<Router>;

  function createComponent(paramId: string | null = null) {
    mockCoffeeService = jasmine.createSpyObj('CoffeeService', ['addCoffee', 'updateCoffee', 'getCoffeeById']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    if (paramId) {
      mockCoffeeService.getCoffeeById.and.returnValue(mockEntry);
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CoffeeFormPageComponent, NoopAnimationsModule],
      providers: [
        { provide: CoffeeService, useValue: mockCoffeeService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(paramId ? { id: paramId } : {})
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoffeeFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('Add mode (no id param)', () => {
    beforeEach(() => createComponent(null));

    it('should create', () => expect(component).toBeTruthy());

    it('isEditMode is false when no id param', () => {
      expect(component.isEditMode).toBeFalse();
    });

    it('form initializes with default values', () => {
      expect(component.form.get('name')?.value).toBe('');
      expect(component.form.get('grindLevel')?.value).toBe(5);
      expect(component.form.get('doseGrams')?.value).toBe(18);
      expect(component.form.get('brewTimeSeconds')?.value).toBe(30);
    });

    it('name field is required', () => {
      component.form.get('name')?.setValue('');
      component.form.get('name')?.markAsTouched();
      expect(component.form.get('name')?.valid).toBeFalse();
      expect(component.getError('name')).toBeTruthy();
    });

    it('grindLevel must be between 1-10', () => {
      component.form.get('grindLevel')?.setValue(0);
      expect(component.form.get('grindLevel')?.valid).toBeFalse();
      component.form.get('grindLevel')?.setValue(11);
      expect(component.form.get('grindLevel')?.valid).toBeFalse();
      component.form.get('grindLevel')?.setValue(5);
      expect(component.form.get('grindLevel')?.valid).toBeTrue();
    });

    it('doseGrams must be between 1-50', () => {
      component.form.get('doseGrams')?.setValue(0);
      expect(component.form.get('doseGrams')?.valid).toBeFalse();
      component.form.get('doseGrams')?.setValue(51);
      expect(component.form.get('doseGrams')?.valid).toBeFalse();
    });

    it('brewTimeSeconds must be between 5-120', () => {
      component.form.get('brewTimeSeconds')?.setValue(4);
      expect(component.form.get('brewTimeSeconds')?.valid).toBeFalse();
      component.form.get('brewTimeSeconds')?.setValue(121);
      expect(component.form.get('brewTimeSeconds')?.valid).toBeFalse();
    });

    it('optional fields accept empty values', () => {
      component.form.patchValue({ origin: '', notes: '', rating: null });
      expect(component.form.get('origin')?.valid).toBeTrue();
      expect(component.form.get('notes')?.valid).toBeTrue();
    });

    it('submit calls addCoffee on valid form and navigates to /', () => {
      mockCoffeeService.addCoffee.and.returnValue(of(mockEntry));
      component.form.patchValue({
        name: 'New Coffee', grindLevel: 5, doseGrams: 18, brewTimeSeconds: 30
      });
      component.onSubmit();
      expect(mockCoffeeService.addCoffee).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('does not submit when form is invalid', () => {
      component.form.get('name')?.setValue('');
      component.onSubmit();
      expect(mockCoffeeService.addCoffee).not.toHaveBeenCalled();
    });

    it('sets submitting=true while the Observable is in flight', () => {
      mockCoffeeService.addCoffee.and.returnValue(NEVER); // never completes
      component.form.patchValue({ name: 'Test', grindLevel: 5, doseGrams: 18, brewTimeSeconds: 30 });
      component.onSubmit();
      expect(component.submitting).toBeTrue();
    });

    it('resets submitting=false and sets submitError on API error', () => {
      mockCoffeeService.addCoffee.and.returnValue(throwError(() => new Error('Network error')));
      component.form.patchValue({ name: 'Test', grindLevel: 5, doseGrams: 18, brewTimeSeconds: 30 });
      component.onSubmit();
      expect(component.submitting).toBeFalse();
      expect(component.submitError).toBeTruthy();
    });

    it('cancel navigates to /', () => {
      component.onCancel();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('Edit mode (with id param)', () => {
    beforeEach(() => createComponent('abc-123'));

    it('isEditMode is true when id param present', () => {
      expect(component.isEditMode).toBeTrue();
    });

    it('patches form with existing entry data', () => {
      expect(component.form.get('name')?.value).toBe('Test Coffee');
      expect(component.form.get('origin')?.value).toBe('Brazil');
      expect(component.form.get('grindLevel')?.value).toBe(6);
    });

    it('submit calls updateCoffee with id and navigates to /', () => {
      mockCoffeeService.updateCoffee.and.returnValue(of(mockEntry));
      component.onSubmit();
      expect(mockCoffeeService.updateCoffee).toHaveBeenCalledWith('abc-123', jasmine.any(Object));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
