import { Component, HostBinding, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { fabEnter } from './fab-button.animations';

@Component({
  selector: 'app-fab-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './fab-button.component.html',
  styleUrl: './fab-button.component.scss',
  animations: [fabEnter]
})
export class FabButtonComponent {
  @HostBinding('@fabEnter') animate = true;

  constructor(private router: Router) {}

  navigateToAdd(): void {
    this.router.navigate(['/add']);
  }
}
