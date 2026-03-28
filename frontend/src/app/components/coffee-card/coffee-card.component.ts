import { Component, Input, Output, EventEmitter, HostBinding, ChangeDetectionStrategy } from '@angular/core';
import { CoffeeEntry, BlendComponent } from '../../models/coffee.models';
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

  get coffeeTypeLabel(): string {
    return this.coffee.coffeeType === 'single-origin' ? 'Single Origin'
      : this.coffee.coffeeType === 'blend' ? 'Blend'
      : '';
  }

  get roastLevelLabel(): string {
    const labels: Record<string, string> = {
      'light': 'Light',
      'medium-light': 'Med-Light',
      'medium': 'Medium',
      'medium-dark': 'Med-Dark',
      'dark': 'Dark',
    };
    return this.coffee.roastLevel ? (labels[this.coffee.roastLevel] ?? '') : '';
  }

  get truncatedNotes(): string {
    if (!this.coffee.notes) return '';
    return this.coffee.notes.length > 100
      ? this.coffee.notes.slice(0, 100) + '…'
      : this.coffee.notes;
  }

  get blendBreakdown(): string {
    if (!this.coffee.blendComponents?.length) return '';
    return this.coffee.blendComponents
      .map((c: BlendComponent) => `${c.percentage}% ${c.origin}`)
      .join(', ');
  }
}
