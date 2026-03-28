import { Component, OnInit } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, map, skip, take } from 'rxjs';
import { BeanEntry } from '../../models/bean.models';
import { BeanService } from '../../services/bean.service';
import { BeanCardComponent } from '../bean-card/bean-card.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface DegassingInfo {
  beanName: string;
  daysUntilPeak: number;
}

@Component({
  selector: 'app-bean-journal-page',
  standalone: true,
  imports: [AsyncPipe, NgClass, RouterLink, BeanCardComponent, ConfirmDialogComponent],
  templateUrl: './bean-journal-page.component.html',
  styleUrl: './bean-journal-page.component.scss'
})
export class BeanJournalPageComponent implements OnInit {
  beans$!: Observable<BeanEntry[]>;
  featuredBean$!: Observable<BeanEntry | null>;
  totalBags$!: Observable<number>;
  topOrigin$!: Observable<string>;
  degassingReminder$!: Observable<DegassingInfo | null>;

  pendingDeleteId: string | null = null;
  loading = true;

  constructor(private beanService: BeanService, private router: Router) {}

  ngOnInit(): void {
    this.beans$ = this.beanService.beans$;

    this.featuredBean$ = this.beanService.beans$.pipe(
      map(beans => {
        const withDate = beans
          .filter(b => b.roastedAt)
          .sort((a, b) => (b.roastedAt! > a.roastedAt! ? 1 : -1));
        return withDate[0] ?? beans[0] ?? null;
      })
    );

    this.totalBags$ = this.beanService.beans$.pipe(map(beans => beans.length));

    this.topOrigin$ = this.beanService.beans$.pipe(
      map(beans => {
        const freq: Record<string, number> = {};
        for (const b of beans) {
          if (b.origin) {
            const word = b.origin.split(/[\s,]+/)[0];
            if (word) freq[word] = (freq[word] ?? 0) + 1;
          }
        }
        const entries = Object.entries(freq);
        if (!entries.length) return '—';
        return entries.sort((a, b) => b[1] - a[1])[0][0];
      })
    );

    this.degassingReminder$ = this.beanService.beans$.pipe(
      map(beans => {
        const peakOffsetMs = 10 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let best: DegassingInfo | null = null;
        for (const b of beans) {
          if (!b.roastedAt) continue;
          const peakMs = new Date(b.roastedAt).getTime() + peakOffsetMs;
          const daysUntilPeak = Math.ceil((peakMs - now) / (24 * 60 * 60 * 1000));
          if (daysUntilPeak > 0 && (!best || daysUntilPeak < best.daysUntilPeak)) {
            best = { beanName: b.name, daysUntilPeak };
          }
        }
        return best;
      })
    );

    this.beanService.beans$.pipe(skip(1), take(1)).subscribe(() => {
      this.loading = false;
    });
  }

  onEdit(id: string): void {
    this.router.navigate(['/beans/edit', id]);
  }

  onDeleteRequest(id: string): void {
    this.pendingDeleteId = id;
  }

  onDeleteConfirmed(): void {
    if (this.pendingDeleteId) {
      this.beanService.deleteBean(this.pendingDeleteId).subscribe({
        error: (err) => console.error('[BeanJournalPage] Delete failed', err)
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
