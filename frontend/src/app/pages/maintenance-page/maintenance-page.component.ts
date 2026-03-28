import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { combineLatest, map, Observable } from 'rxjs';
import { MaintenanceService } from '../../services/maintenance.service';
import { MaintenanceTaskView, MaintenanceTaskPayload, IntervalType } from '../../models/maintenance.models';
import { MaintenanceTaskCardComponent } from '../../components/maintenance-task-card/maintenance-task-card.component';

const ICON_OPTIONS = ['🔄', '🧪', '⚙️', '🔧', '🫧', '🧹', '💧', '🛠️', '🔩', '✨', '📋', '⏱️'];

interface PageVm {
  tasks: MaintenanceTaskView[];
  totalShots: number;
  overdueCount: number;
  dueSoonCount: number;
}

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaintenanceTaskCardComponent],
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
        const views = tasks
          .map(t => MaintenanceService.computeTaskView(t, settings.totalShots))
          .sort((a, b) => {
            const statusOrder = { overdue: 0, 'due-soon': 1, ok: 2 };
            const diff = statusOrder[a.status] - statusOrder[b.status];
            return diff !== 0 ? diff : a.sortOrder - b.sortOrder;
          });
        return {
          tasks: views,
          totalShots: settings.totalShots,
          overdueCount: views.filter(t => t.status === 'overdue').length,
          dueSoonCount: views.filter(t => t.status === 'due-soon').length,
        };
      })
    );

    this.addForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(60)]],
      icon: [ICON_OPTIONS[0], Validators.required],
      intervalType: ['shots' as IntervalType, Validators.required],
      intervalValue: [10, [Validators.required, Validators.min(1)]],
    });
  }

  increment(currentShots: number): void {
    this.maintenanceService.updateShotCount(1).subscribe();
  }

  decrement(currentShots: number): void {
    this.maintenanceService.updateShotCount(-1).subscribe();
  }

  startShotEdit(currentShots: number): void {
    this.shotEditValue = currentShots;
    this.shotEditMode = true;
  }

  commitShotEdit(): void {
    if (!this.shotEditMode) return;
    this.shotEditMode = false;
    this.maintenanceService.setShotCount(Math.max(0, this.shotEditValue)).subscribe();
  }

  onShotEditKeydown(event: KeyboardEvent, currentShots: number): void {
    if (event.key === 'Enter') this.commitShotEdit();
    if (event.key === 'Escape') {
      this.shotEditMode = false;
      this.shotEditValue = currentShots;
    }
  }

  completeTask(taskId: string): void {
    this.maintenanceService.completeTask(taskId).subscribe();
  }

  openAddForm(): void {
    this.editingTaskId = null;
    this.addForm.reset({
      name: '',
      icon: ICON_OPTIONS[0],
      intervalType: 'shots',
      intervalValue: 10,
    });
    this.showAddForm = true;
  }

  openEditForm(task: MaintenanceTaskView): void {
    this.editingTaskId = task.id;
    this.addForm.setValue({
      name: task.name,
      icon: task.icon,
      intervalType: task.intervalType,
      intervalValue: task.intervalValue,
    });
    this.showAddForm = true;
  }

  cancelForm(): void {
    this.showAddForm = false;
    this.editingTaskId = null;
  }

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

  deleteTask(taskId: string): void {
    this.maintenanceService.deleteTask(taskId).subscribe();
  }

  selectIcon(icon: string): void {
    this.addForm.patchValue({ icon });
  }

  trackById(_: number, task: MaintenanceTaskView): string {
    return task.id;
  }
}
