import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarNavComponent } from './components/sidebar-nav/sidebar-nav.component';
import { pageSlide } from './app.animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarNavComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [pageSlide]
})
export class AppComponent {
  getRouteAnimation(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }
}
