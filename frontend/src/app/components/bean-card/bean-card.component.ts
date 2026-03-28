import { Component, Input, Output, EventEmitter, HostBinding, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { BeanEntry } from '../../models/bean.models';
import { cardEnterLeave } from '../coffee-card/coffee-card.animations';

@Component({
  selector: 'app-bean-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './bean-card.component.html',
  styleUrl: './bean-card.component.scss',
  animations: [cardEnterLeave]
})
export class BeanCardComponent {
  @Input({ required: true }) bean!: BeanEntry;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @HostBinding('@cardEnterLeave') animate = true;

  get gradientClass(): string {
    let hash = 0;
    for (let i = 0; i < this.bean.id.length; i++) {
      hash = (hash << 5) - hash + this.bean.id.charCodeAt(i);
      hash |= 0;
    }
    return `card-gradient-${Math.abs(hash) % 6}`;
  }

  get roastedAtFormatted(): string {
    if (!this.bean.roastedAt) return '';
    return new Date(this.bean.roastedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get daysAgoRoasted(): number {
    if (!this.bean.roastedAt) return 0;
    return Math.floor((Date.now() - new Date(this.bean.roastedAt).getTime()) / (24 * 60 * 60 * 1000));
  }

  get roastLevelLabel(): string {
    const labels: Record<string, string> = {
      'light': 'Light', 'medium-light': 'Med-Light', 'medium': 'Medium',
      'medium-dark': 'Med-Dark', 'dark': 'Dark',
    };
    return this.bean.roastLevel ? (labels[this.bean.roastLevel] ?? '') : '';
  }
}
