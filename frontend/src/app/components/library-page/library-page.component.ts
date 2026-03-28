import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { Observable, map, skip, take } from 'rxjs';
import { CoffeeEntry } from '../../models/coffee.models';
import { CoffeeService } from '../../services/coffee.service';
import { SearchService } from '../../services/search.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { CoffeeCardGridComponent } from '../coffee-card-grid/coffee-card-grid.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface DegassingInfo {
  coffeeName: string;
  daysUntilPeak: number;
}

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [AsyncPipe, NgClass, RouterLink, SearchBarComponent, CoffeeCardGridComponent, ConfirmDialogComponent],
  templateUrl: './library-page.component.html',
  styleUrl: './library-page.component.scss'
})
export class LibraryPageComponent implements OnInit {
  filteredCoffees$!: Observable<CoffeeEntry[]>;
  featuredCoffee$!: Observable<CoffeeEntry | null>;
  activeBagsCount$!: Observable<number>;
  topRegion$!: Observable<string>;
  degassingReminder$!: Observable<DegassingInfo | null>;

  pendingDeleteId: string | null = null;
  loading = true;
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private coffeeService: CoffeeService,
    private searchService: SearchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.filteredCoffees$ = this.coffeeService.filteredCoffees$(this.searchService.query$);

    this.featuredCoffee$ = this.coffeeService.coffees$.pipe(
      map(coffees => {
        const rated = coffees
          .filter(c => c.rating != null)
          .sort((a, b) => (b.rating! - a.rating!) || (b.updatedAt > a.updatedAt ? 1 : -1));
        return rated[0] ?? coffees[0] ?? null;
      })
    );

    this.activeBagsCount$ = this.coffeeService.coffees$.pipe(
      map(coffees => coffees.length)
    );

    this.topRegion$ = this.coffeeService.coffees$.pipe(
      map(coffees => {
        const freq: Record<string, number> = {};
        for (const c of coffees) {
          if (c.origin) {
            const word = c.origin.split(/[\s,]+/)[0];
            if (word) freq[word] = (freq[word] ?? 0) + 1;
          }
        }
        const entries = Object.entries(freq);
        if (!entries.length) return '—';
        return entries.sort((a, b) => b[1] - a[1])[0][0];
      })
    );

    this.degassingReminder$ = this.coffeeService.coffees$.pipe(
      map(coffees => {
        const peakOffsetMs = 10 * 24 * 60 * 60 * 1000; // 10 days
        const now = Date.now();
        let best: DegassingInfo | null = null;

        for (const c of coffees) {
          if (!c.roastedAt) continue;
          const peakMs = new Date(c.roastedAt).getTime() + peakOffsetMs;
          const daysUntilPeak = Math.ceil((peakMs - now) / (24 * 60 * 60 * 1000));
          if (daysUntilPeak > 0 && (!best || daysUntilPeak < best.daysUntilPeak)) {
            best = { coffeeName: c.name, daysUntilPeak };
          }
        }
        return best;
      })
    );

    this.coffeeService.coffees$.pipe(skip(1), take(1)).subscribe(() => {
      this.loading = false;
    });
  }

  onSearch(query: string): void {
    this.searchService.setQuery(query);
  }

  onEdit(id: string): void {
    this.router.navigate(['/edit', id]);
  }

  onDeleteRequest(id: string): void {
    this.pendingDeleteId = id;
  }

  onDeleteConfirmed(): void {
    if (this.pendingDeleteId) {
      this.coffeeService.deleteCoffee(this.pendingDeleteId).subscribe({
        error: (err) => console.error('[LibraryPage] Delete failed', err)
      });
    }
    this.pendingDeleteId = null;
  }

  onDeleteCancelled(): void {
    this.pendingDeleteId = null;
  }

  getGradientClass(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return `card-gradient-${Math.abs(hash) % 6}`;
  }

  getDaysAgoRoasted(roastedAt: string): number {
    return Math.floor((Date.now() - new Date(roastedAt).getTime()) / (24 * 60 * 60 * 1000));
  }
}
