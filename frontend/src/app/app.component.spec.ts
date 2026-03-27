import { TestBed } from '@angular/core/testing';
import { RouterOutlet, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule],
      providers: [provideRouter(routes)]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('getRouteAnimation returns empty string when outlet has no animation data', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const mockOutlet = { activatedRouteData: {} } as RouterOutlet;
    expect(app.getRouteAnimation(mockOutlet)).toBe('');
  });

  it('getRouteAnimation returns the animation key from route data', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const mockOutlet = { activatedRouteData: { animation: 'LibraryPage' } } as unknown as RouterOutlet;
    expect(app.getRouteAnimation(mockOutlet)).toBe('LibraryPage');
  });
});
