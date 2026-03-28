import { Component, Input, Output, EventEmitter, HostBinding, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { CoffeeEntry } from '../../models/coffee.models';
import { cardEnterLeave } from './coffee-card.animations';

@Component({
  selector: 'app-coffee-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './coffee-card.component.html',
  styleUrl: './coffee-card.component.scss',
  animations: [cardEnterLeave]
})
export class CoffeeCardComponent {
  @Input({ required: true }) coffee!: CoffeeEntry;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @HostBinding('@cardEnterLeave') animate = true;

  /** Hash coffee id → one of 6 gradient class names for consistent per-card colors. */
  get gradientClass(): string {
    let hash = 0;
    for (let i = 0; i < this.coffee.id.length; i++) {
      hash = (hash << 5) - hash + this.coffee.id.charCodeAt(i);
      hash |= 0;
    }
    return `card-gradient-${Math.abs(hash) % 6}`;
  }

  get roastedAtFormatted(): string {
    if (!this.coffee.roastedAt) return '';
    return new Date(this.coffee.roastedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

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
}
