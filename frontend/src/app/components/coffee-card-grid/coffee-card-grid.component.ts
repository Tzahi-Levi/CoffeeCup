import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CoffeeEntry } from '../../models/coffee.models';
import { CoffeeCardComponent } from '../coffee-card/coffee-card.component';
import { listAnimation } from './coffee-card-grid.animations';

@Component({
  selector: 'app-coffee-card-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoffeeCardComponent],
  templateUrl: './coffee-card-grid.component.html',
  styleUrl: './coffee-card-grid.component.scss',
  animations: [listAnimation]
})
export class CoffeeCardGridComponent {
  @Input() coffees: CoffeeEntry[] = [];
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
}
