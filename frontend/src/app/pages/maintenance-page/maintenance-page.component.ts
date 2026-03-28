import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { combineLatest, map, Observable } from 'rxjs';
import { MaintenanceService } from '../../services/maintenance.service';
import { MaintenanceTaskView, MaintenanceTaskPayload, IntervalType } from '../../models/maintenance.models';

const ICON_OPTIONS = ['🔄', '🧪', '⚙️', '🔧', '🫧', '🧹', '💧', '🛠️', '🔩', '✨', '📋', '⏱️'];

interface PageVm {
  tasks: MaintenanceTaskView[];
  alertTasks: MaintenanceTaskView[];
  historyEntries: MaintenanceTaskView[];
  totalShots: number;
  overdueCount: number;
  dueSoonCount: number;
  healthIndex: number;
  nextShotsLabel: string;
}

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './maintenance-page.component.html',
  styleUrl: './maintenance-page.component.scss',
})
export class MaintenancePageComponent implements OnInit {
  vm$!: Observable<PageVm>;

  showAddForm = false;
  editingTaskId: string | null = null;
  addForm!: FormGroup;
  shotEditMode = false;
  shotEditValue = 0;

  readonly iconOptions = ICON_OPTIONS;
  readonly intervalTypes: IntervalType[] = ['shots', 'days'];

  constructor(
    private maintenanceService: MaintenanceService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([
      this.maintenanceService.tasks$,
      this.maintenanceService.settings$,
    ]).pipe(
      map(([tasks, settings]) => {
        const statusOrder = { overdue: 0, 'due-soon': 1, ok: 2 };
        const views = tasks
          .map(t => MaintenanceService.computeTaskView(t, settings.totalShots))
          .sort((a, b) => {
            const diff = statusOrder[a.status] - statusOrder[b.status];
            return diff !== 0 ? diff : a.sortOrder - b.sortOrder;
          });

        const overdueCount = views.filter(t => t.status === 'overdue').length;
        const dueSoonCount = views.filter(t => t.status === 'due-soon').length;
        const okCount = views.filter(t => t.status === 'ok').length;
        const total = views.length || 1;
        const healthIndex = Math.round((okCount / total) * 100);

        const alertTasks = views.filter(t => t.status !== 'ok');

        // Label for the shots progress bar: nearest shots-based task
        const nextShotsTask = views
          .filter(t => t.intervalType === 'shots' && t.status !== 'overdue')
          .sort((a, b) => (a.shotsUntilNext ?? 999) - (b.shotsUntilNext ?? 999))[0];
        const nextShotsLabel = nextShotsTask
          ? `${nextShotsTask.shotsUntilNext} shots until next ${nextShotsTask.name.toLowerCase()}`
          : 'All shots-based tasks up to date';

        const historyEntries = [...views]
          .filter(t => t.lastCompletedAt !== null)
          .sort((a, b) => new Date(b.lastCompletedAt!).getTime() - new Date(a.lastCompletedAt!).getTime());

        return { tasks: views, alertTasks, historyEntries, totalShots: settings.totalShots, overdueCount, dueSoonCount, healthIndex, nextShotsLabel };
      })
    );

    this.addForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(60)]],
      icon: [ICON_OPTIONS[0], Validators.required],
      intervalType: ['shots' as IntervalType, Validators.required],
      intervalValue: [10, [Validators.required, Validators.min(1)]],
    });
  }

  increment(): void { this.maintenanceService.updateShotCount(1).subscribe(); }
  decrement(current: number): void {
    if (current > 0) this.maintenanceService.updateShotCount(-1).subscribe();
  }

  startShotEdit(current: number): void {
    this.shotEditValue = current;
    this.shotEditMode = true;
  }

  commitShotEdit(): void {
    if (!this.shotEditMode) return;
    this.shotEditMode = false;
    this.maintenanceService.setShotCount(Math.max(0, this.shotEditValue)).subscribe();
  }

  onShotEditKeydown(event: KeyboardEvent, current: number): void {
    if (event.key === 'Enter') this.commitShotEdit();
    if (event.key === 'Escape') { this.shotEditMode = false; this.shotEditValue = current; }
  }

  completeTask(taskId: string): void { this.maintenanceService.completeTask(taskId).subscribe(); }

  openAddForm(): void {
    this.editingTaskId = null;
    this.addForm.reset({ name: '', icon: ICON_OPTIONS[0], intervalType: 'shots', intervalValue: 10 });
    this.showAddForm = true;
  }

  openEditForm(task: MaintenanceTaskView): void {
    this.editingTaskId = task.id;
    this.addForm.setValue({ name: task.name, icon: task.icon, intervalType: task.intervalType, intervalValue: task.intervalValue });
    this.showAddForm = true;
  }

  cancelForm(): void { this.showAddForm = false; this.editingTaskId = null; }

  submitForm(): void {
    if (this.addForm.invalid) return;
    const payload = this.addForm.value as MaintenanceTaskPayload;
    if (this.editingTaskId) {
      this.maintenanceService.updateTask(this.editingTaskId, payload).subscribe();
    } else {
      this.maintenanceService.addTask(payload).subscribe();
    }
    this.cancelForm();
  }

  deleteTask(taskId: string): void { this.maintenanceService.deleteTask(taskId).subscribe(); }
  selectIcon(icon: string): void { this.addForm.patchValue({ icon }); }
  trackById(_: number, task: MaintenanceTaskView): string { return task.id; }

  timeLabel(task: MaintenanceTaskView): string {
    if (task.intervalType === 'shots') {
      const shots = task.shotsUntilNext ?? 0;
      if (task.status === 'overdue') return `${Math.abs(shots)} shots ago`;
      if (task.lastCompletedShots != null) return `${Math.abs(shots)} shots left`;
      return 'Never done';
    } else {
      const days = task.daysUntilNext ?? 0;
      if (task.status === 'overdue') return `${Math.abs(days)}d overdue`;
      if (task.lastCompletedAt) return `in ${days}d`;
      return 'Never done';
    }
  }

  progressText(task: MaintenanceTaskView, totalShots: number): string {
    if (task.intervalType === 'shots') {
      const consumed = Math.max(0, totalShots - (task.lastCompletedShots ?? 0));
      return `${consumed} / ${task.intervalValue} shots`;
    } else {
      if (!task.lastCompletedAt) return `0 / ${task.intervalValue} days`;
      const elapsed = Math.floor((Date.now() - new Date(task.lastCompletedAt).getTime()) / 86_400_000);
      return `${elapsed} / ${task.intervalValue} days`;
    }
  }

  lastDoneLabel(task: MaintenanceTaskView): string {
    if (!task.lastCompletedAt) return 'Never done';
    const ms = Date.now() - new Date(task.lastCompletedAt).getTime();
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  formatHistoryDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  historySubtitle(task: MaintenanceTaskView): string {
    if (task.intervalType === 'shots' && task.lastCompletedShots != null) {
      return `Shot #${task.lastCompletedShots.toLocaleString()} · Every ${task.intervalValue} shots`;
    }
    return `Every ${task.intervalValue} ${task.intervalType}`;
  }

  historyStatusLabel(task: MaintenanceTaskView): string {
    if (task.status === 'ok') return 'COMPLETED';
    if (task.status === 'due-soon') return 'DUE SOON';
    return 'NEEDS SERVICE';
  }

  systemStatus(healthIndex: number): string {
    if (healthIndex === 100) return 'SYSTEM OPTIMAL';
    if (healthIndex >= 80) return 'SYSTEM GOOD';
    if (healthIndex >= 50) return 'NEEDS ATTENTION';
    return 'ACTION REQUIRED';
  }
}
