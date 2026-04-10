import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  MaintenanceTask,
  MaintenanceTaskPayload,
  MaintenanceSettings,
  MaintenanceTaskView,
  TaskStatus,
} from '../models/maintenance.models';

const API_BASE = '/api/v1/maintenance';
const DUE_SOON_THRESHOLD = 0.8; // 80% of interval elapsed = due soon

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private _tasks$ = new BehaviorSubject<MaintenanceTask[]>([]);
  private _settings$ = new BehaviorSubject<MaintenanceSettings>({ totalShots: 0 });

  readonly tasks$ = this._tasks$.asObservable();
  readonly settings$ = this._settings$.asObservable();

  constructor(private http: HttpClient) {
    this.loadAll();
    this.loadSettings();
  }

  private loadAll(): void {
    this.http.get<{ data: MaintenanceTask[] }>(`${API_BASE}/tasks`).subscribe({
      next: res => this._tasks$.next(res.data),
      error: err => console.error('Failed to load maintenance tasks', err),
    });
  }

  loadSettings(): void {
    this.http.get<{ data: MaintenanceSettings }>(`${API_BASE}/settings`).subscribe({
      next: res => this._settings$.next(res.data),
      error: err => console.error('Failed to load maintenance settings', err),
    });
  }

  addTask(payload: MaintenanceTaskPayload): Observable<{ data: MaintenanceTask }> {
    return this.http.post<{ data: MaintenanceTask }>(`${API_BASE}/tasks`, payload).pipe(
      tap(() => this.loadAll())
    );
  }

  updateTask(id: string, payload: Partial<MaintenanceTaskPayload>): Observable<{ data: MaintenanceTask }> {
    return this.http.put<{ data: MaintenanceTask }>(`${API_BASE}/tasks/${id}`, payload).pipe(
      tap(() => this.loadAll())
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/tasks/${id}`).pipe(
      tap(() => this.loadAll())
    );
  }

  completeTask(id: string): Observable<{ data: MaintenanceTask }> {
    return this.http.post<{ data: MaintenanceTask }>(`${API_BASE}/tasks/${id}/complete`, {}).pipe(
      tap(() => this.loadAll())
    );
  }

  setShotCount(total: number): Observable<{ data: MaintenanceSettings }> {
    return this.http.put<{ data: MaintenanceSettings }>(`${API_BASE}/settings`, { totalShots: total }).pipe(
      tap(res => this._settings$.next(res.data))
    );
  }

  updateShotCount(delta: number): Observable<{ data: MaintenanceSettings }> {
    const current = this._settings$.value.totalShots;
    return this.setShotCount(Math.max(0, current + delta));
  }

  static computeTaskView(task: MaintenanceTask, totalShots: number): MaintenanceTaskView {
    let progressPercent = 0;
    let status: TaskStatus = 'ok';
    let shotsUntilNext: number | null = null;
    let daysUntilNext: number | null = null;

    if (task.intervalType === 'shots') {
      const baseline = task.lastCompletedShots ?? 0;
      const elapsed = totalShots - baseline;
      // Clamp to 0 if total fell below the completion baseline (e.g. after data migration or log deletions)
      progressPercent = Math.max(0, Math.round((elapsed / task.intervalValue) * 100));
      // shotsUntilNext uses raw elapsed so it correctly reflects how many shots until next due
      shotsUntilNext = task.intervalValue - elapsed;

      if (progressPercent >= 100) {
        status = 'overdue';
      } else if (progressPercent >= DUE_SOON_THRESHOLD * 100) {
        status = 'due-soon';
      }
    } else {
      if (task.lastCompletedAt) {
        const lastMs = new Date(task.lastCompletedAt).getTime();
        const nowMs = Date.now();
        const elapsedDays = (nowMs - lastMs) / (1000 * 60 * 60 * 24);
        progressPercent = Math.round((elapsedDays / task.intervalValue) * 100);
        daysUntilNext = Math.ceil(task.intervalValue - elapsedDays);

        if (progressPercent >= 100) {
          status = 'overdue';
        } else if (progressPercent >= DUE_SOON_THRESHOLD * 100) {
          status = 'due-soon';
        }
      } else {
        // Never completed — show as due soon if interval <= 30 days, overdue if > 30
        progressPercent = 0;
        daysUntilNext = task.intervalValue;
        status = 'ok';
      }
    }

    return { ...task, status, progressPercent, shotsUntilNext, daysUntilNext };
  }
}
