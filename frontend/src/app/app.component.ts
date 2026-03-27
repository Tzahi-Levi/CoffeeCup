import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { pageSlide } from './app.animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToolbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [pageSlide]
})
export class AppComponent {
  getRouteAnimation(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }
}
