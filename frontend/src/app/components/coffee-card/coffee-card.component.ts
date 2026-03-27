import { Component, Input, Output, EventEmitter, HostBinding, ChangeDetectionStrategy } from '@angular/core';
import { CoffeeEntry } from '../../models/coffee.models';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { cardEnterLeave } from './coffee-card.animations';

@Component({
  selector: 'app-coffee-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StarRatingComponent],
  templateUrl: './coffee-card.component.html',
  styleUrl: './coffee-card.component.scss',
  animations: [cardEnterLeave]
})
export class CoffeeCardComponent {
  @Input({ required: true }) coffee!: CoffeeEntry;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @HostBinding('@cardEnterLeave') animate = true;

  get truncatedNotes(): string {
    if (!this.coffee.notes) return '';
    return this.coffee.notes.length > 80
      ? this.coffee.notes.slice(0, 77) + '...'
      : this.coffee.notes;
  }

  get roastLevelLabel(): string {
    const labels: Record<string, string> = {
      'light': 'Light',
      'medium-light': 'Medium-Light',
      'medium': 'Medium',
      'medium-dark': 'Medium-Dark',
      'dark': 'Dark',
    };
    return this.coffee.roastLevel ? (labels[this.coffee.roastLevel] ?? '') : '';
  }

  get coffeeTypeLabel(): string {
    return this.coffee.coffeeType === 'single-origin' ? 'Single Origin'
      : this.coffee.coffeeType === 'blend' ? 'Blend'
      : '';
  }

  get blendBreakdown(): string {
    return this.coffee.blendComponents
      .map((c) => `${c.percentage}% ${c.origin}`)
      .join(', ');
  }
}
