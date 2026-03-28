import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaintenanceTaskView } from '../../models/maintenance.models';

@Component({
  selector: 'app-maintenance-task-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './maintenance-task-card.component.html',
  styleUrl: './maintenance-task-card.component.scss',
})
export class MaintenanceTaskCardComponent {
  @Input({ required: true }) task!: MaintenanceTaskView;
  @Output() complete = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  get progressCapped(): number {
    return Math.min(this.task.progressPercent, 100);
  }

  get subLine(): string {
    const t = this.task;
    if (t.intervalType === 'shots') {
      const shots = t.shotsUntilNext ?? 0;
      if (t.status === 'overdue') {
        return `${Math.abs(shots)} shots overdue`;
      }
      return `${shots} shots until next`;
    } else {
      const days = t.daysUntilNext ?? 0;
      if (t.status === 'overdue') {
        return `${Math.abs(days)} days overdue`;
      }
      return `${days} days until next`;
    }
  }
}
