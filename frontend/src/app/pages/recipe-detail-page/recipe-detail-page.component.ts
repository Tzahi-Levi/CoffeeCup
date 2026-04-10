import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap, tap, map, Observable, combineLatest, of } from 'rxjs';
import { CoffeeService } from '../../services/coffee.service';
import { BrewLogService } from '../../services/brew-log.service';
import { CoffeeEntry } from '../../models/coffee.models';
import { BrewLog, BrewLogPayload } from '../../models/brew-log.models';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';

@Component({
  selector: 'app-recipe-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StarRatingComponent],
  templateUrl: './recipe-detail-page.component.html',
  styleUrl: './recipe-detail-page.component.scss',
})
export class RecipeDetailPageComponent implements OnInit {
  coffee$!: Observable<CoffeeEntry | undefined>;
  logs: BrewLog[] = [];
  coffeeId = '';

  showLogForm = false;
  submitting = false;
  editingLogId: string | null = null;

  // Form fields — pre-filled from recipe, user adjusts
  logRating = 3;
  logDose = 0;
  logGrind = 0;
  logBrewTime = 0;
  logYield: number | null = null;
  logNotes = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coffeeService: CoffeeService,
    private brewLogService: BrewLogService,
  ) {}

  ngOnInit(): void {
    this.coffeeId = this.route.snapshot.paramMap.get('id') ?? '';

    // Resolve coffee from the shared cache — no extra HTTP call
    this.coffee$ = this.coffeeService.coffees$.pipe(
      map(coffees => coffees.find(c => c.id === this.coffeeId))
    );

    // Pre-fill form as soon as coffee resolves
    this.coffee$.pipe(
      tap(coffee => {
        if (coffee && !this.showLogForm) {
          this.logDose = coffee.doseGrams;
          this.logGrind = coffee.grindLevel;
          this.logBrewTime = coffee.brewTimeSeconds;
        }
      })
    ).subscribe();

    this.loadLogs();
  }

  loadLogs(): void {
    if (!this.coffeeId) return;
    this.brewLogService.getLogs(this.coffeeId).subscribe({
      next: res => this.logs = res.data,
      error: err => console.error('[RecipeDetail] Failed to load logs', err),
    });
  }

  openLogForm(coffee: CoffeeEntry): void {
    this.editingLogId = null;
    this.logDose = coffee.doseGrams;
    this.logGrind = coffee.grindLevel;
    this.logBrewTime = coffee.brewTimeSeconds;
    this.logYield = null;
    this.logNotes = '';
    this.logRating = 3;
    this.showLogForm = true;
  }

  editLog(log: BrewLog): void {
    this.editingLogId = log.id;
    this.logRating = log.rating;
    this.logDose = log.doseGrams;
    this.logGrind = log.grindLevel;
    this.logBrewTime = log.brewTimeSeconds;
    this.logYield = log.yieldGrams;
    this.logNotes = log.notes ?? '';
    this.showLogForm = true;
  }

  cancelLogForm(): void {
    this.showLogForm = false;
    this.editingLogId = null;
  }

  submitLog(): void {
    if (this.submitting) return;
    this.submitting = true;
    const payload: BrewLogPayload = {
      rating: this.logRating,
      doseGrams: this.logDose,
      grindLevel: this.logGrind,
      brewTimeSeconds: this.logBrewTime,
      yieldGrams: this.logYield,
      notes: this.logNotes.trim() || null,
    };

    if (this.editingLogId) {
      this.brewLogService.updateLog(this.coffeeId, this.editingLogId, payload).subscribe({
        next: res => {
          this.logs = this.logs.map(l => l.id === res.data.id ? res.data : l);
          this.showLogForm = false;
          this.editingLogId = null;
          this.submitting = false;
          this.coffeeService.refresh().subscribe();
        },
        error: err => {
          console.error('[RecipeDetail] Failed to update log', err);
          this.submitting = false;
        },
      });
    } else {
      this.brewLogService.addLog(this.coffeeId, payload).subscribe({
        next: res => {
          this.logs = [res.data, ...this.logs];
          this.showLogForm = false;
          this.submitting = false;
          this.coffeeService.refresh().subscribe();
        },
        error: err => {
          console.error('[RecipeDetail] Failed to save log', err);
          this.submitting = false;
        },
      });
    }
  }

  deleteLog(logId: string): void {
    this.brewLogService.deleteLog(this.coffeeId, logId).subscribe({
      next: () => {
        this.logs = this.logs.filter(l => l.id !== logId);
        this.coffeeService.refresh().subscribe();
      },
      error: err => console.error('[RecipeDetail] Failed to delete log', err),
    });
  }

  get avgRating(): number | null {
    if (!this.logs.length) return null;
    return Math.round((this.logs.reduce((s, l) => s + l.rating, 0) / this.logs.length) * 10) / 10;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ratioLabel(log: BrewLog): string {
    if (!log.yieldGrams) return '';
    const ratio = (log.yieldGrams / log.doseGrams).toFixed(1);
    return `1:${ratio}`;
  }
}
