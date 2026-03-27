import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  @Output() searchQuery = new EventEmitter<string>();

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.emit(input.value);
  }
}
