import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss'
})
export class StarRatingComponent {
  @Input() rating: number | null = 0;
  @Input() readonly: boolean = true;
  @Output() ratingChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];

  setRating(star: number): void {
    if (!this.readonly) {
      this.rating = star;
      this.ratingChange.emit(star);
    }
  }

  isFilled(star: number): boolean {
    return star <= (this.rating ?? 0);
  }
}
