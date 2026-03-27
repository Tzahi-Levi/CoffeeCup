import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar.component';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a search input element', () => {
    const input = fixture.nativeElement.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('input has correct placeholder text', () => {
    const input = fixture.nativeElement.querySelector('input');
    expect(input.placeholder).toBe('Search coffees...');
  });

  it('emits searchQuery on input event', () => {
    spyOn(component.searchQuery, 'emit');
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'brazil';
    input.dispatchEvent(new Event('input'));
    expect(component.searchQuery.emit).toHaveBeenCalledWith('brazil');
  });

  it('emits empty string when input is cleared', () => {
    spyOn(component.searchQuery, 'emit');
    const input = fixture.nativeElement.querySelector('input');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(component.searchQuery.emit).toHaveBeenCalledWith('');
  });
});
