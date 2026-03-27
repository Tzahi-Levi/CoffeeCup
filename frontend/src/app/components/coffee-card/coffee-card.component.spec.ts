import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoffeeCardComponent } from './coffee-card.component';
import { CoffeeEntry } from '../../models/coffee.models';

describe('CoffeeCardComponent', () => {
  let component: CoffeeCardComponent;
  let fixture: ComponentFixture<CoffeeCardComponent>;

  const mockCoffee: CoffeeEntry = {
    id: '1',
    name: 'Ethiopian Yirgacheffe',
    origin: 'Light Roast, Ethiopia',
    grindLevel: 7,
    doseGrams: 18,
    brewTimeSeconds: 28,
    notes: 'Bright and floral',
    rating: 4,
    roastLevel: 'light',
    coffeeType: 'single-origin',
    blendComponents: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoffeeCardComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(CoffeeCardComponent);
    component = fixture.componentInstance;
    component.coffee = mockCoffee;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays coffee name', () => {
    const name = fixture.nativeElement.querySelector('.coffee-card__name');
    expect(name.textContent.trim()).toBe('Ethiopian Yirgacheffe');
  });

  it('displays origin when present', () => {
    const origin = fixture.nativeElement.querySelector('.coffee-card__origin');
    expect(origin.textContent.trim()).toBe('Light Roast, Ethiopia');
  });

  it('displays grind level, dose, and brew time stats', () => {
    const values = fixture.nativeElement.querySelectorAll('.coffee-card__stat-value');
    const texts = Array.from(values).map((v: any) => v.textContent.trim());
    expect(texts).toContain('7/10');
    expect(texts).toContain('18g');
    expect(texts).toContain('28s');
  });

  it('truncates notes longer than 80 chars', () => {
    const longNotes = 'A'.repeat(100);
    component.coffee = { ...mockCoffee, notes: longNotes };
    fixture.detectChanges();
    expect(component.truncatedNotes.length).toBe(80);
    expect(component.truncatedNotes.endsWith('...')).toBeTrue();
  });

  it('emits edit event on edit button click', () => {
    spyOn(component.edit, 'emit');
    const editBtn = fixture.nativeElement.querySelector('[title="Edit"]');
    editBtn.click();
    expect(component.edit.emit).toHaveBeenCalled();
  });

  it('emits delete event on delete button click', () => {
    spyOn(component.delete, 'emit');
    const deleteBtn = fixture.nativeElement.querySelector('[title="Delete"]');
    deleteBtn.click();
    expect(component.delete.emit).toHaveBeenCalled();
  });
});
