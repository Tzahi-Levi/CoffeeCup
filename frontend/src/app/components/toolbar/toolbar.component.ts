import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {}
