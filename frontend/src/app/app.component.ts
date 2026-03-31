import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { WalkthroughComponent } from './components/walkthrough/walkthrough.component';
import { AuthService } from './services/auth.service';
import { WalkthroughService } from './services/walkthrough.service';
import { pageSlide } from './app.animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToolbarComponent, WalkthroughComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [pageSlide]
})
export class AppComponent {
  private auth = inject(AuthService);
  private walkthrough = inject(WalkthroughService);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.walkthrough.checkAndShow(user.id);
      }
    });
  }

  getRouteAnimation(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }
}
