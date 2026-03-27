import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  let component: StarRatingComponent;
  let fixture: ComponentFixture<StarRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders 5 star buttons', () => {
    fixture.detectChanges();
    const stars = fixture.nativeElement.querySelectorAll('.star-rating__star');
    expect(stars.length).toBe(5);
  });

  it('fills correct number of stars for rating 3', () => {
    component.rating = 3;
    component.readonly = true;
    fixture.detectChanges();
    const filled = fixture.nativeElement.querySelectorAll('.star-rating__star--filled');
    expect(filled.length).toBe(3);
  });

  it('fills 5 stars for rating 5', () => {
    component.rating = 5;
    fixture.detectChanges();
    const filled = fixture.nativeElement.querySelectorAll('.star-rating__star--filled');
    expect(filled.length).toBe(5);
  });

  it('fills 0 stars for rating 0', () => {
    component.rating = 0;
    fixture.detectChanges();
    const filled = fixture.nativeElement.querySelectorAll('.star-rating__star--filled');
    expect(filled.length).toBe(0);
  });

  it('emits ratingChange when clicked in interactive mode', () => {
    component.rating = 0;
    component.readonly = false;
    fixture.detectChanges();
    spyOn(component.ratingChange, 'emit');
    const stars = fixture.nativeElement.querySelectorAll('.star-rating__star');
    stars[2].click();
    expect(component.ratingChange.emit).toHaveBeenCalledWith(3);
  });

  it('does not emit in readonly mode', () => {
    component.rating = 0;
    component.readonly = true;
    fixture.detectChanges();
    spyOn(component.ratingChange, 'emit');
    const stars = fixture.nativeElement.querySelectorAll('.star-rating__star');
    stars[2].click();
    expect(component.ratingChange.emit).not.toHaveBeenCalled();
  });
});
